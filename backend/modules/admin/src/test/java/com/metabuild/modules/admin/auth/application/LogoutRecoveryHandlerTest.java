package com.metabuild.modules.admin.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.metabuild.shared.kernel.security.AuthorizationFence;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import com.metabuild.shared.kernel.security.AuthorizationState;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class LogoutRecoveryHandlerTest {
    @Test void terminalDeleteIsIdempotentAfterFenceWasAlreadyDeleted() {
        UUID user = UUID.fromString("01900000-0000-7000-8000-000000000001");
        var fence = new AuthorizationFence(user, 3,
                UUID.fromString("01900000-0000-7000-8000-000000000099"), Instant.EPOCH);
        var fencePresent = new AtomicBoolean(true);
        AuthorizationSnapshotStore snapshots = new AuthorizationSnapshotStore() {
            @Override public boolean initializeReady(AuthorizationSnapshot snapshot) { return false; }
            @Override public AuthorizationState load(UUID userId) { return fencePresent.get() ? fence : null; }
            @Override public boolean fence(AuthorizationFence value) { return false; }
            @Override public boolean deleteIfFence(AuthorizationFence value) { fencePresent.set(false); return true; }
            @Override public void delete(UUID userId) { fencePresent.set(false); }
        };
        RefreshTokenStore tokens = new NoopTokens();
        AccountSessionPort sessions = new NoopSessions();
        LogoutRecoveryPort recovery = new LogoutRecoveryPort() {
            @Override public void record(AuthorizationFence value, RuntimeException failure) {}
            @Override public void complete(AuthorizationFence value) {}
        };
        var handler = new LogoutRecoveryHandler(tokens, sessions, snapshots, recovery);
        handler.recover(fence);
        assertThat(fencePresent).isFalse();
        handler.recover(fence);
    }
    @Test void kickoutFailurePersistsTokenPhaseAndRetryDoesNotRevokeAgain(){
        var ids=new com.metabuild.shared.kernel.UuidV7Generator();UUID user=ids.generate();var fence=new AuthorizationFence(user,3,ids.generate(),Instant.EPOCH);
        var tokenCalls=new AtomicInteger();var kickCalls=new AtomicInteger();var phase=new AtomicReference<>("FENCED");
        RefreshTokenStore tokens=new NoopTokens(){@Override public void revokeAll(UUID id){tokenCalls.incrementAndGet();}};
        AccountSessionPort sessions=new NoopSessions(){@Override public void kickoutAll(UUID id){if(kickCalls.getAndIncrement()==0)throw new IllegalStateException("kickout");}};
        LogoutRecoveryPort recovery=recovery(phase);var handler=new LogoutRecoveryHandler(tokens,sessions,new MissingSnapshots(),recovery);var batch=new BatchDelete();
        assertThatThrownBy(()->handler.recover(fence,phase.get(),batch)).isInstanceOf(IllegalStateException.class);
        assertThat(phase).hasValue("TOKENS_REVOKED");
        handler.recover(fence,phase.get(),batch);
        assertThat(tokenCalls).hasValue(1);assertThat(kickCalls).hasValue(2);assertThat(phase).hasValue("SESSIONS_KICKED");
    }
    @Test void deleteFailurePersistsSessionsPhaseAndRetryOnlyDeletes(){
        var ids=new com.metabuild.shared.kernel.UuidV7Generator();UUID user=ids.generate();var fence=new AuthorizationFence(user,3,ids.generate(),Instant.EPOCH);
        var phase=new AtomicReference<>("FENCED");var tokens=new CountingTokens();var sessions=new CountingSessions();var batch=new BatchDelete();batch.failFirst=true;
        var handler=new LogoutRecoveryHandler(tokens,sessions,new MissingSnapshots(),recovery(phase));
        assertThatThrownBy(()->handler.recover(fence,phase.get(),batch)).isInstanceOf(AuthorizationUnavailable.class);
        assertThat(phase).hasValue("SESSIONS_KICKED");handler.recover(fence,phase.get(),batch);
        assertThat(tokens.calls).hasValue(1);assertThat(sessions.calls).hasValue(1);assertThat(batch.calls).hasValue(2);
    }
    private static LogoutRecoveryPort recovery(AtomicReference<String> phase){return new LogoutRecoveryPort(){public void record(AuthorizationFence f,RuntimeException e){}public boolean advance(AuthorizationFence f,String expected,String next){return phase.compareAndSet(expected,next);}};}
    private static class NoopTokens implements RefreshTokenStore {
        public String issue(UUID id){return "";} public RefreshRotationOutcome rotate(String t){return RefreshRotationOutcome.rejected();}
        public void revoke(String t){} public void revokeAll(UUID id){}
    }
    private static class NoopSessions implements AccountSessionPort {
        public AccessSession login(UUID id,long revision){return new AccessSession("",1);} public void logoutToken(String t){} public void kickoutAll(UUID id){}
    }
    private static final class CountingTokens extends NoopTokens {final AtomicInteger calls=new AtomicInteger();@Override public void revokeAll(UUID id){calls.incrementAndGet();}}
    private static final class CountingSessions extends NoopSessions {final AtomicInteger calls=new AtomicInteger();@Override public void kickoutAll(UUID id){calls.incrementAndGet();}}
    private static final class MissingSnapshots implements AuthorizationSnapshotStore {public boolean initializeReady(AuthorizationSnapshot s){return false;}public AuthorizationState load(UUID id){return null;}public boolean fence(AuthorizationFence f){return false;}public boolean deleteIfFence(AuthorizationFence f){return false;}public void delete(UUID id){}}
    private static final class BatchDelete implements AuthorizationBatchSnapshotStore {final AtomicInteger calls=new AtomicInteger();boolean failFirst;public java.util.Set<UUID> fenceAll(UUID op,java.util.Map<UUID,Long> t,Instant at){return t.keySet();}public boolean readyAll(UUID op,java.util.Map<UUID,AuthorizationSnapshot>s){return true;}public void compensate(UUID op,java.util.Map<UUID,AuthorizationSnapshot>s){}public boolean terminalDelete(UUID op,UUID user,long revision){int call=calls.getAndIncrement();return !failFirst||call>0;}}
}
