package com.metabuild.modules.admin.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.metabuild.modules.admin.auth.api.AuthorizationRefreshService;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AuthorizationCommandExecutorTest {
    private static final UUID USER = UUID.fromString("01900000-0000-7000-8000-000000000001");
    private static final UUID OP = UUID.fromString("01900000-0000-7000-8000-000000000002");

    @Test void rollbackCompensatesOnlyItsFenceAndDoesNotLeaveOutbox() {
        var port = new FakePort();
        port.failMutation = true;
        var snapshots = new FakeSnapshots(port);
        var executor = executor(port, snapshots);

        assertThatThrownBy(() -> executor.execute(AuthorizationRefreshService.Cause.ROLE_CHANGED, change(port)))
                .isInstanceOf(IllegalStateException.class);

        assertThat(port.events).containsExactly("lock", "revisions", "compile", "fence", "mutate", "rollback", "compensate");
        assertThat(snapshots.compensated).containsExactly(OP);
        assertThat(port.outbox).isEmpty();
    }

    @Test void committedMutationThatCannotPublishReadyRemainsFencedAndPending() {
        var port = new FakePort();
        var snapshots = new FakeSnapshots(port);
        snapshots.ready = false;
        var executor = executor(port, snapshots);

        assertThatThrownBy(() -> executor.execute(AuthorizationRefreshService.Cause.GRANT_CHANGED, change(port)))
                .isInstanceOf(AuthorizationRefreshPending.class);

        assertThat(port.events).containsExactly("lock", "revisions", "compile", "fence", "mutate", "increment", "outbox", "commit", "compile", "ready");
        assertThat(port.outbox).containsExactly(OP);
        assertThat(snapshots.compensated).isEmpty();
    }

    @Test void successUsesOneBulkFenceAndOneBulkReadyPublication() {
        var port = new FakePort();
        var snapshots = new FakeSnapshots(port);
        var executor = executor(port, snapshots);

        assertThat(executor.execute(AuthorizationRefreshService.Cause.USER_CHANGED, change(port))).isEqualTo("ok");

        assertThat(snapshots.fenceBatches).isOne();
        assertThat(snapshots.readyBatches).isOne();
        assertThat(port.events).containsExactly("lock", "revisions", "compile", "fence", "mutate", "increment", "outbox", "commit", "compile", "ready", "done");
    }

    @Test void terminalFailureAfterCommitNeverPublishesReady() {
        var port=new FakePort();var snapshots=new FakeSnapshots(port);var tokens=new FakeTokens();var sessions=new FakeSessions();sessions.fail=true;
        var executor=new AuthorizationCommandExecutor(port,snapshots,()->OP,Clock.fixed(Instant.EPOCH,ZoneOffset.UTC),tokens,sessions);
        var change=new AuthorizationRefreshService.TerminalChange<String>(){public Set<UUID> affectedUserIds(){return Set.of(USER);}public String mutate(){port.events.add("mutate");return "ok";}public AuthorizationRefreshService.TerminalAction terminalAction(){return AuthorizationRefreshService.TerminalAction.DISABLE_ACCOUNT;}};
        assertThatThrownBy(()->executor.executeTerminal(change)).isInstanceOf(AuthorizationRefreshPending.class);
        assertThat(tokens.revoked).containsExactly(USER);assertThat(snapshots.readyBatches).isZero();assertThat(snapshots.terminalDeletes).isZero();
        assertThat(port.outbox).containsExactly(OP);
    }
    @Test void pipelineExceptionAfterPartialFenceCompensatesAllCandidates(){var port=new FakePort();var snapshots=new FakeSnapshots(port);snapshots.fenceFailure=true;var executor=executor(port,snapshots);assertThatThrownBy(()->executor.execute(AuthorizationRefreshService.Cause.ROLE_CHANGED,change(port))).isInstanceOf(AuthorizationUnavailable.class);assertThat(snapshots.compensated).containsExactly(OP);}

    @Test void catalogCommandLocksCatalogBeforeAuthzAndPublishesReadyOnlyAfterCommit(){var port=new FakePort();var snapshots=new FakeSnapshots(port);var executor=executor(port,snapshots);assertThat(executor.executeCatalog(AuthorizationRefreshService.Cause.GRANT_CHANGED,change(port))).isEqualTo("ok");assertThat(port.events).containsExactly("catalog-lock","lock","revisions","compile","fence","mutate","increment","outbox","commit","compile","ready","done");}

    @Test void catalogCommitFailureCompensatesFenceAndNeverPublishesReady(){var port=new FakePort();port.failCommit=true;var snapshots=new FakeSnapshots(port);var executor=executor(port,snapshots);assertThatThrownBy(()->executor.executeCatalog(AuthorizationRefreshService.Cause.GRANT_CHANGED,change(port))).isInstanceOf(IllegalStateException.class);assertThat(port.events).containsExactly("catalog-lock","lock","revisions","compile","fence","mutate","increment","outbox","rollback","compensate");assertThat(snapshots.readyBatches).isZero();}

    private static AuthorizationRefreshService.AuthorizationChange<String> change(FakePort port) {
        return new AuthorizationRefreshService.AuthorizationChange<>() {
            public Set<UUID> affectedUserIds() { return Set.of(USER); }
            public String mutate() { port.events.add("mutate"); if (port.failMutation) throw new IllegalStateException("boom"); return "ok"; }
        };
    }

    private static AuthorizationCommandExecutor executor(FakePort port, FakeSnapshots snapshots) {
        return new AuthorizationCommandExecutor(port, snapshots, () -> OP,
                Clock.fixed(Instant.parse("2026-07-11T00:00:00Z"), ZoneOffset.UTC));
    }

    private static final class FakePort implements AuthorizationRefreshPort {
        final List<String> events = new ArrayList<>(); final List<UUID> outbox = new ArrayList<>(); boolean failMutation,failCommit;
        public <T> T inTransaction(TransactionWork<T> work) { try { T value=work.run();if(failCommit)throw new IllegalStateException("commit"); events.add("commit"); return value; } catch(RuntimeException e){events.add("rollback");throw e;} }
        public void lockCatalogSeed(){events.add("catalog-lock");}
        public void lockAuthzGraph(){events.add("lock");}
        public Map<UUID,Long> revisions(Set<UUID> ids){events.add("revisions");return Map.of(USER, 2L);}
        public Map<UUID,Long> incrementRevisions(Set<UUID> ids){events.add("increment");return Map.of(USER, 3L);}
        public void appendRefreshOutbox(UUID operationId, Map<UUID,Long> revisions, AuthorizationRefreshService.Cause cause){events.add("outbox");outbox.add(operationId);}
        public void appendTerminalOutbox(UUID operationId,Map<UUID,Long> revisions,AuthorizationRefreshService.TerminalAction action){events.add("terminal-outbox");outbox.add(operationId);}
        public Map<UUID,AuthorizationSnapshot> compileSnapshots(Set<UUID> ids){events.add("compile");return Map.of(USER, SnapshotFixtures.ready(USER,3));}
        public void markDone(UUID operationId,Set<UUID> ids){events.add("done");}
    }
    private static final class FakeSnapshots implements AuthorizationBatchSnapshotStore {
        final FakePort port; int fenceBatches,readyBatches,terminalDeletes; boolean ready=true,fenceFailure; final List<UUID> compensated=new ArrayList<>();
        FakeSnapshots(FakePort port){this.port=port;}
        public Set<UUID> fenceAll(UUID op,Map<UUID,Long> target,Instant at){port.events.add("fence");fenceBatches++;if(fenceFailure)throw new AuthorizationUnavailable();return target.keySet();}
        public boolean readyAll(UUID op,Map<UUID,AuthorizationSnapshot> values){port.events.add("ready");readyBatches++;return ready;}
        public void compensate(UUID op,Map<UUID,AuthorizationSnapshot> values){port.events.add("compensate");compensated.add(op);}
        public boolean terminalDelete(UUID op,UUID user,long revision){terminalDeletes++;return true;}
    }
    private static final class FakeTokens implements RefreshTokenStore {final List<UUID> revoked=new ArrayList<>();public String issue(UUID u){throw new UnsupportedOperationException();}public RefreshRotationOutcome rotate(String t){throw new UnsupportedOperationException();}public void revoke(String t){}public void revokeAll(UUID u){revoked.add(u);}}
    private static final class FakeSessions implements AccountSessionPort {boolean fail;public AccessSession login(UUID u,long revision){throw new UnsupportedOperationException();}public void logoutToken(String t){}public void kickoutAll(UUID u){if(fail)throw new IllegalStateException("down");}}
}
