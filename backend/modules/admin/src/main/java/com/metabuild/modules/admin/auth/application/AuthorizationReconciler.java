package com.metabuild.modules.admin.auth.application;

import com.metabuild.shared.kernel.security.AuthorizationFence;
import java.time.Clock;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;

/** 有界 outbox/fence 前滚器。调度器每轮显式给出 limit，禁止 KEYS/SCAN。 */
public final class AuthorizationReconciler {
    private final AuthorizationReconciliationPort tasks;private final AuthorizationRefreshPort database;
    private final AuthorizationBatchSnapshotStore batch;private final AuthorizationSnapshotStore states;
    private final LogoutRecoveryHandler terminal;private final UUID workerId;private final int limit;
    private final AuthorizationFenceIndex fences;private final Clock clock;
    public AuthorizationReconciler(AuthorizationReconciliationPort tasks,AuthorizationRefreshPort database,
            AuthorizationBatchSnapshotStore batch,AuthorizationSnapshotStore states,LogoutRecoveryHandler terminal,
            Clock clock,UUID workerId,int limit){this(tasks,database,batch,states,terminal,null,clock,workerId,limit);}
    public AuthorizationReconciler(AuthorizationReconciliationPort tasks,AuthorizationRefreshPort database,
            AuthorizationBatchSnapshotStore batch,AuthorizationSnapshotStore states,LogoutRecoveryHandler terminal,
            AuthorizationFenceIndex fences,Clock clock,UUID workerId,int limit){this.tasks=tasks;this.database=database;this.batch=batch;this.states=states;this.terminal=terminal;this.fences=fences;this.clock=clock;this.workerId=workerId;this.limit=limit;}
    public int reconcile(){
        int completed=0;
        for(var task:tasks.claim(workerId,limit,Duration.ofSeconds(30))){
            try{
                if("LOGOUT_ALL".equals(task.eventType())){
                    var fence=new AuthorizationFence(task.userId(),task.targetRevision(),task.operationId(),clock.instant());
                    terminal.recover(fence,task.recoveryPhase(),batch);
                    if(tasks.complete(task))completed++;
                    continue;
                }
                Boolean done=database.inTransaction(()->{
                    database.lockAuthzGraph();
                    com.metabuild.shared.kernel.security.AuthorizationState state;
                    try{state=states.load(task.userId());}
                    catch(AuthorizationUnavailable missingOrUnavailable){
                        var ready=database.compileSnapshots(Set.of(task.userId()));
                        if(!batch.initializeAll(ready))throw missingOrUnavailable;
                        return true;
                    }
                    if(state instanceof com.metabuild.shared.kernel.security.AuthorizationSnapshot ready
                            && "REFRESH".equals(task.eventType()) && ready.revision()>=task.targetRevision()){
                        return true;
                    }
                    if (!(state instanceof AuthorizationFence fence)) return false;
                    if(!fence.operationId().equals(task.operationId()))return false;
                    if("REFRESH".equals(task.eventType())){
                        var ready=database.compileSnapshots(Set.of(task.userId()));
                        if(!batch.readyAll(task.operationId(),ready))throw new AuthorizationUnavailable();
                    }
                    return true;
                });
                if(Boolean.TRUE.equals(done)&&tasks.complete(task))completed++;
            }catch(RuntimeException e){tasks.failed(task,e.getClass().getSimpleName());}
        }
        return completed;
    }
    public boolean recoverAbandoned(AuthorizationFence fence){return database.inTransaction(()->{database.lockAuthzGraph();if(tasks.outboxExists(fence.operationId(),fence.userId()))return false;long current=database.revisions(Set.of(fence.userId())).get(fence.userId());if(current>=fence.targetRevision())return false;batch.compensate(fence.operationId(),database.compileSnapshots(Set.of(fence.userId())));return true;});}
    public int reconcileAbandoned(Duration minimumAge){
        if(fences==null)return 0;
        int recovered=0;
        for(var fence:fences.fencedCandidates(clock.instant().minus(minimumAge),limit))if(recoverAbandoned(fence))recovered++;
        return recovered;
    }
}
