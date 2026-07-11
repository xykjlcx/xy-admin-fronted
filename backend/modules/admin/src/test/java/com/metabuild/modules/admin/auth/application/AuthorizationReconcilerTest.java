package com.metabuild.modules.admin.auth.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.metabuild.modules.admin.auth.api.AuthorizationRefreshService;
import com.metabuild.shared.kernel.security.AuthorizationFence;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import com.metabuild.shared.kernel.security.AuthorizationState;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AuthorizationReconcilerTest {
    private static final UUID ID=UUID.fromString("01900000-0000-7000-8000-000000000001");
    private static final UUID OP=UUID.fromString("01900000-0000-7000-8000-000000000002");
    private static final UUID USER=UUID.fromString("01900000-0000-7000-8000-000000000003");
    private static final UUID WORKER=UUID.fromString("01900000-0000-7000-8000-000000000004");
    private static final Clock CLOCK=Clock.fixed(Instant.parse("2026-07-11T00:00:00Z"),ZoneOffset.UTC);

    @Test void terminalCrashAfterRedisDeleteCompletesWithSameLease() {
        var tasks=new Tasks(new AuthorizationReconciliationPort.Task(ID,OP,USER,3,"LOGOUT_ALL","SESSIONS_KICKED",WORKER,2));
        var batch=new Batch();batch.deleted=true;
        var reconciler=new AuthorizationReconciler(tasks,new Database(),batch,new MissingState(),terminal(),CLOCK,WORKER,10);
        assertThat(reconciler.reconcile()).isOne();
        assertThat(tasks.completed).isTrue();
        assertThat(batch.terminalDeletes).isOne();
    }

    @Test void expiredWorkerCannotCompleteOrFailNewLease() {
        var stale=new AuthorizationReconciliationPort.Task(ID,OP,USER,3,"REFRESH",null,WORKER,1);
        var current=new AuthorizationReconciliationPort.Task(ID,OP,USER,3,"REFRESH",null,WORKER,2);
        var tasks=new Tasks(current);
        assertThat(tasks.complete(stale)).isFalse();
        assertThat(tasks.failed(stale,"late")).isFalse();
        assertThat(tasks.complete(current)).isTrue();
    }

    @Test void scheduledAbandonedScanIsBoundedAndOnlyCompensatesMissingOutboxBelowTarget() {
        var fence=new AuthorizationFence(USER,3,OP,CLOCK.instant().minus(Duration.ofMinutes(2)));
        var tasks=new Tasks(null);var database=new Database();var batch=new Batch();
        AuthorizationFenceIndex index=(before,limit)->{assertThat(limit).isEqualTo(10);return List.of(fence);};
        var reconciler=new AuthorizationReconciler(tasks,database,batch,new MissingState(),terminal(),index,CLOCK,WORKER,10);
        assertThat(reconciler.reconcileAbandoned(Duration.ofMinutes(1))).isOne();
        assertThat(batch.compensations).isOne();
        tasks.exists=true;
        assertThat(reconciler.reconcileAbandoned(Duration.ofMinutes(1))).isZero();
    }

    private static LogoutRecoveryHandler terminal(){return new LogoutRecoveryHandler(new Tokens(),new Sessions(),new MissingState(),new Recovery());}
    private static final class Tasks implements AuthorizationReconciliationPort {
        final Task task;boolean completed,exists;Tasks(Task task){this.task=task;}
        public List<Task> claim(UUID worker,int limit,Duration lease){return task==null?List.of():List.of(task);}
        public boolean outboxExists(UUID operationId,UUID userId){return exists;}
        public boolean complete(Task candidate){if(task==null||candidate.attempt()!=task.attempt())return false;completed=true;return true;}
        public boolean failed(Task candidate,String error){return task!=null&&candidate.attempt()==task.attempt();}
    }
    private static final class Database implements AuthorizationRefreshPort {
        public <T>T inTransaction(TransactionWork<T> work){return work.run();}public void lockAuthzGraph(){}
        public Map<UUID,Long> revisions(Set<UUID> users){return Map.of(USER,2L);}
        public Map<UUID,Long> incrementRevisions(Set<UUID> users){return Map.of();}
        public void appendRefreshOutbox(UUID op,Map<UUID,Long> r,AuthorizationRefreshService.Cause c){}
        public void appendTerminalOutbox(UUID op,Map<UUID,Long> r,AuthorizationRefreshService.TerminalAction a){}
        public Map<UUID,AuthorizationSnapshot> compileSnapshots(Set<UUID> users){return Map.of(USER,SnapshotFixtures.ready(USER,2));}
        public void markDone(UUID op,Set<UUID> users){}
    }
    private static final class Batch implements AuthorizationBatchSnapshotStore {
        int terminalDeletes,compensations;boolean deleted;
        public Set<UUID> fenceAll(UUID op,Map<UUID,Long> r,Instant at){return r.keySet();}
        public boolean readyAll(UUID op,Map<UUID,AuthorizationSnapshot> s){return true;}
        public void compensate(UUID op,Map<UUID,AuthorizationSnapshot> s){compensations++;}
        public boolean terminalDelete(UUID op,UUID user,long revision){terminalDeletes++;return true;}
    }
    private static final class MissingState implements AuthorizationSnapshotStore {
        public boolean initializeReady(AuthorizationSnapshot s){return true;}public AuthorizationState load(UUID u){throw new AuthorizationUnavailable();}
        public boolean fence(AuthorizationFence f){return true;}public boolean deleteIfFence(AuthorizationFence f){return true;}public void delete(UUID u){}
    }
    private static final class Tokens implements RefreshTokenStore {public String issue(UUID u){return "";}public RefreshRotationOutcome rotate(String t){return RefreshRotationOutcome.rejected();}public void revoke(String t){}public void revokeAll(UUID u){}}
    private static final class Sessions implements AccountSessionPort {public AccessSession login(UUID u,long revision){return null;}public void logoutToken(String t){}public void kickoutAll(UUID u){}}
    private static final class Recovery implements LogoutRecoveryPort {public void record(AuthorizationFence f,RuntimeException e){}public void complete(AuthorizationFence f){}public boolean advance(AuthorizationFence f,String expected,String next){return true;}}
}
