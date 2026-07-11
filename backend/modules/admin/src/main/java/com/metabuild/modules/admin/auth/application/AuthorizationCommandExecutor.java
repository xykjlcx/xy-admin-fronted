package com.metabuild.modules.admin.auth.application;

import com.metabuild.modules.admin.auth.api.AuthorizationRefreshService;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import java.time.Clock;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;

public final class AuthorizationCommandExecutor implements AuthorizationRefreshService {
    private final AuthorizationRefreshPort database;
    private final AuthorizationBatchSnapshotStore snapshots;
    private final Supplier<UUID> operationIds;
    private final Clock clock;
    private final RefreshTokenStore tokens;
    private final AccountSessionPort sessions;
    private final LogoutRecoveryHandler terminal;

    public AuthorizationCommandExecutor(AuthorizationRefreshPort database, AuthorizationBatchSnapshotStore snapshots,
            Supplier<UUID> operationIds, Clock clock) { this(database,snapshots,operationIds,clock,null,null); }
    public AuthorizationCommandExecutor(AuthorizationRefreshPort database, AuthorizationBatchSnapshotStore snapshots,
            Supplier<UUID> operationIds, Clock clock,RefreshTokenStore tokens,AccountSessionPort sessions) {
        this.database=database; this.snapshots=snapshots; this.operationIds=operationIds; this.clock=clock;this.tokens=tokens;this.sessions=sessions;this.terminal=null;
    }
    public AuthorizationCommandExecutor(AuthorizationRefreshPort database,AuthorizationBatchSnapshotStore snapshots,
            Supplier<UUID> operationIds,Clock clock,LogoutRecoveryHandler terminal){this.database=database;this.snapshots=snapshots;this.operationIds=operationIds;this.clock=clock;this.tokens=null;this.sessions=null;this.terminal=terminal;}

    @Override public <T> T execute(Cause cause, AuthorizationChange<T> change) {
        return executeRefresh(cause,change,false);
    }
    @Override public <T> T executeCatalog(Cause cause, AuthorizationChange<T> change) {
        return executeRefresh(cause,change,true);
    }
    private <T> T executeRefresh(Cause cause, AuthorizationChange<T> change,boolean catalog) {
        UUID operationId=operationIds.get();
        Holder<Map<UUID,AuthorizationSnapshot>> preimage=new Holder<>();
        Holder<Set<UUID>> fenced=new Holder<>();
        TransactionResult<T> committed;
        try {
            committed=database.inTransaction(() -> {
                if(catalog)database.lockCatalogSeed();
                database.lockAuthzGraph();
                Set<UUID> users=Set.copyOf(change.affectedUserIds());
                Map<UUID,Long> oldRevisions=database.revisions(users);
                preimage.value=database.compileSnapshots(users);
                Map<UUID,Long> targets=oldRevisions.entrySet().stream().collect(java.util.stream.Collectors.toUnmodifiableMap(Map.Entry::getKey,e->e.getValue()+1));
                // pipeline 可能在部分命令已生效后以异常结束；调用前即登记全部候选，
                // catch 必须对完整 preimage 做同 operationId CAS 补偿。
                fenced.value=users;
                Set<UUID> confirmed=snapshots.fenceAll(operationId,targets,clock.instant());
                if (!confirmed.equals(users)) throw new AuthorizationUnavailable();
                T result=change.mutate();
                Map<UUID,Long> revisions=database.incrementRevisions(users);
                if (!revisions.equals(targets)) throw new IllegalStateException("Authorization revision mismatch");
                database.appendRefreshOutbox(operationId,revisions,cause);
                return new TransactionResult<>(result,users,revisions);
            });
        } catch (RuntimeException failure) {
            if (fenced.value!=null&&!fenced.value.isEmpty()&&preimage.value!=null) snapshots.compensate(operationId,preimage.value);
            throw failure;
        }
        try {
            Map<UUID,AuthorizationSnapshot> ready=database.compileSnapshots(committed.users());
            if (!snapshots.readyAll(operationId,ready)) throw new AuthorizationRefreshPending();
            database.markDone(operationId,committed.users());
            return committed.result();
        } catch (AuthorizationRefreshPending failure) { throw failure; }
        catch (RuntimeException failure) { throw new AuthorizationRefreshPending(); }
    }

    @Override public <T> T executeTerminal(TerminalChange<T> change) {
        if(terminal==null&&(tokens==null||sessions==null))throw new IllegalStateException("Terminal protocol is not configured");
        UUID operationId=operationIds.get();
        Holder<Map<UUID,AuthorizationSnapshot>> preimage=new Holder<>();Holder<Set<UUID>> fencedUsers=new Holder<>();
        TransactionResult<T> committed;
        try { committed=database.inTransaction(()->{
            database.lockAuthzGraph();Set<UUID> users=Set.copyOf(change.affectedUserIds());
            Map<UUID,Long> old=database.revisions(users);preimage.value=database.compileSnapshots(users);Map<UUID,Long> targets=old.entrySet().stream().collect(java.util.stream.Collectors.toUnmodifiableMap(Map.Entry::getKey,e->e.getValue()+1));
            fencedUsers.value=users;Set<UUID> fenced=snapshots.fenceAll(operationId,targets,clock.instant());if(!fenced.equals(users))throw new AuthorizationUnavailable();
            T result=change.mutate();Map<UUID,Long> revisions=database.incrementRevisions(users);if(!revisions.equals(targets))throw new IllegalStateException("Authorization revision mismatch");
            database.appendTerminalOutbox(operationId,revisions,change.terminalAction());return new TransactionResult<>(result,users,revisions);
        }); } catch(RuntimeException e){if(fencedUsers.value!=null&&!fencedUsers.value.isEmpty()&&preimage.value!=null)snapshots.compensate(operationId,preimage.value);throw e;}
        try{for(UUID user:committed.users()){if(terminal!=null)terminal.recover(new com.metabuild.shared.kernel.security.AuthorizationFence(user,committed.revisions().get(user),operationId,clock.instant()),"FENCED",snapshots);else{tokens.revokeAll(user);sessions.kickoutAll(user);if(!snapshots.terminalDelete(operationId,user,committed.revisions().get(user)))throw new AuthorizationRefreshPending();}}database.markDone(operationId,committed.users());return committed.result();}
        catch(AuthorizationRefreshPending e){throw e;}catch(RuntimeException e){throw new AuthorizationRefreshPending();}
    }
    @Override public <T>T executeEnable(AuthorizationChange<T> change){
        UUID operationId=operationIds.get();
        TransactionResult<T> committed=database.inTransaction(()->{
            database.lockAuthzGraph();Set<UUID> users=Set.copyOf(change.affectedUserIds());
            Map<UUID,Long> old=database.revisions(users);T result=change.mutate();
            Map<UUID,Long> revisions=database.incrementRevisions(users);
            Map<UUID,Long> expected=old.entrySet().stream().collect(java.util.stream.Collectors.toUnmodifiableMap(Map.Entry::getKey,e->e.getValue()+1));
            if(!revisions.equals(expected))throw new IllegalStateException("Authorization revision mismatch");
            database.appendRefreshOutbox(operationId,revisions,Cause.USER_CHANGED);return new TransactionResult<>(result,users,revisions);
        });
        try{Map<UUID,AuthorizationSnapshot> ready=database.compileSnapshots(committed.users());if(!snapshots.initializeAll(ready))throw new AuthorizationRefreshPending();database.markDone(operationId,committed.users());return committed.result();}
        catch(AuthorizationRefreshPending e){throw e;}catch(RuntimeException e){throw new AuthorizationRefreshPending();}
    }
    @Override public <T>T executeInitialize(AuthorizationChange<T> change){
        UUID operationId=operationIds.get();
        TransactionResult<T> committed=database.inTransaction(()->{
            database.lockAuthzGraph();Set<UUID> users=Set.copyOf(change.affectedUserIds());
            T result=change.mutate();
            Map<UUID,Long> old=database.revisions(users);
            Map<UUID,Long> revisions=database.incrementRevisions(users);
            Map<UUID,Long> expected=old.entrySet().stream().collect(java.util.stream.Collectors.toUnmodifiableMap(Map.Entry::getKey,e->e.getValue()+1));
            if(!revisions.equals(expected))throw new IllegalStateException("Authorization revision mismatch");
            database.appendRefreshOutbox(operationId,revisions,Cause.USER_CHANGED);
            return new TransactionResult<>(result,users,revisions);
        });
        try{Map<UUID,AuthorizationSnapshot> ready=database.compileSnapshots(committed.users());if(!snapshots.initializeAll(ready))throw new AuthorizationRefreshPending();database.markDone(operationId,committed.users());return committed.result();}
        catch(AuthorizationRefreshPending e){throw e;}catch(RuntimeException e){throw new AuthorizationRefreshPending();}
    }
    private static final class Holder<T>{T value;}
    private record TransactionResult<T>(T result,Set<UUID> users,Map<UUID,Long> revisions){}
}
