package com.metabuild.app.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.metabuild.modules.admin.auth.api.AuthorizationRefreshService;
import com.metabuild.modules.admin.auth.application.*;
import com.metabuild.modules.admin.auth.persistence.JdbcAuthorizationGraphRepository;
import com.metabuild.modules.admin.auth.persistence.JdbcAuthorizationRefreshRepository;
import com.metabuild.modules.admin.auth.persistence.JdbcLogoutRecoveryRepository;
import com.metabuild.modules.admin.roles.persistence.JdbcRoleRepository;
import com.metabuild.schema.platform.PlatformFlywayRunner;
import com.metabuild.shared.kernel.UuidV7Generator;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import java.time.Clock;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.Future;
import net.ttddyy.dsproxy.QueryCountHolder;
import net.ttddyy.dsproxy.support.ProxyDataSourceBuilder;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class AuthorizationCommandConcurrencyIntegrationTest {
    static String url,user;static DriverManagerDataSource primary;static JdbcTemplate jdbc;static final UuidV7Generator IDS=new UuidV7Generator();
    @BeforeAll static void setup(){url=System.getProperty("task16.pg.url");Assumptions.assumeTrue(url!=null);user=System.getProperty("task16.pg.user","ocean");primary=source();PlatformFlywayRunner.migrate(primary);jdbc=new JdbcTemplate(primary);}

    @Test void twoDataSourcesSerializeAuthzGraphAndSecondPreimageSeesFirstRevision() throws Exception {
        UUID admin=UUID.fromString("01900000-0000-7000-8000-000000000010");long before=revision(admin);var targets=new CopyOnWriteArrayList<Long>();var batch=new RecordingBatch(targets);
        var first=bundle(batch);var second=bundle(batch);var insideFirst=new CountDownLatch(1);var release=new CountDownLatch(1);var pool=Executors.newFixedThreadPool(2);Future<Integer> one=null,two=null;
        try{
            one=pool.submit(()->first.executor().execute(AuthorizationRefreshService.Cause.USER_CHANGED,change(admin,()->{first.jdbc().update("update mb_user set display_name='first' where id=?",admin);insideFirst.countDown();await(release);return 1;})));
            assertThat(insideFirst.await(2,TimeUnit.SECONDS)).isTrue();
            two=pool.submit(()->second.executor().execute(AuthorizationRefreshService.Cause.USER_CHANGED,change(admin,()->second.jdbc().update("update mb_user set display_name='second' where id=?",admin))));
            Thread.sleep(150);assertThat(two.isDone()).isFalse();release.countDown();assertThat(one.get(5,TimeUnit.SECONDS)).isOne();assertThat(two.get(5,TimeUnit.SECONDS)).isOne();
        } finally {
            release.countDown();if(one!=null)one.cancel(true);if(two!=null)two.cancel(true);pool.shutdownNow();assertThat(pool.awaitTermination(3,TimeUnit.SECONDS)).isTrue();
        }
        assertThat(revision(admin)).isEqualTo(before+2);assertThat(targets).containsExactly(before+1,before+2);assertNoWaitingLocks();
    }

    @Test void oneHundredUsersUseOneAffectedQueryAndThreeGraphQueries(){
        UUID role=jdbc.queryForObject("select id from mb_role where code='SYSTEM_ADMIN'",UUID.class),dept=jdbc.queryForObject("select id from mb_dept order by created_at limit 1",UUID.class);
        var users=new ArrayList<UUID>();users.add(UUID.fromString("01900000-0000-7000-8000-000000000010"));
        for(int i=1;i<100;i++){UUID id=IDS.generate();users.add(id);jdbc.update("insert into mb_user(id,dept_id,username,password_hash,display_name,status) values(?,?,?,'!','Count','ACTIVE')",id,dept,"count-"+id);jdbc.update("insert into mb_user_role(user_id,role_id) values(?,?)",id,role);}
        var proxy=ProxyDataSourceBuilder.create(primary).name("task16-counts").countQuery().build();var countedJdbc=new JdbcTemplate(proxy);
        QueryCountHolder.clear();assertThat(new JdbcRoleRepository(countedJdbc).members(role)).containsAll(users);assertThat(QueryCountHolder.getGrandTotal().getTotal()).isEqualTo(1);
        QueryCountHolder.clear();assertThat(new JdbcAuthorizationGraphRepository(countedJdbc).loadAll(Set.copyOf(users))).hasSize(100);assertThat(QueryCountHolder.getGrandTotal().getTotal()).isEqualTo(3);
        jdbc.update("delete from mb_user where id=any(?::uuid[])",ps->ps.setArray(1,ps.getConnection().createArrayOf("uuid",users.subList(1,users.size()).toArray())));
    }
    @Test void terminalExternalFailuresCommitEachPhaseInIndependentTransactions(){
        UUID admin=UUID.fromString("01900000-0000-7000-8000-000000000010"),operation=IDS.generate(),id=IDS.generate();long target=revision(admin)+1;
        jdbc.update("insert into mb_authz_refresh_outbox(id,operation_id,user_id,target_revision,event_type,status,recovery_phase,recovery_payload) values(?,?,?,?, 'LOGOUT_ALL','PENDING','FENCED','{}'::jsonb)",id,operation,admin,target);
        var recovery=new JdbcLogoutRecoveryRepository(new JdbcTemplate(source()),IDS);var tokens=new CountingTokens();var sessions=new FailingOnceSessions();var deletes=new FailingOnceDelete();
        var handler=new LogoutRecoveryHandler(tokens,sessions,new MissingSnapshots(),recovery);var fence=new com.metabuild.shared.kernel.security.AuthorizationFence(admin,target,operation,Instant.now());
        org.assertj.core.api.Assertions.assertThatThrownBy(()->handler.recover(fence,"FENCED",deletes)).isInstanceOf(IllegalStateException.class);
        assertThat(phase(operation)).isEqualTo("TOKENS_REVOKED");
        org.assertj.core.api.Assertions.assertThatThrownBy(()->handler.recover(fence,phase(operation),deletes)).isInstanceOf(AuthorizationUnavailable.class);
        assertThat(phase(operation)).isEqualTo("SESSIONS_KICKED");handler.recover(fence,phase(operation),deletes);
        assertThat(tokens.calls).isOne();assertThat(sessions.calls).isEqualTo(2);assertThat(deletes.calls).isEqualTo(2);
    }

    private static ExecutorBundle bundle(AuthorizationBatchSnapshotStore batch){var ds=source();var localJdbc=new JdbcTemplate(ds);var graph=new JdbcAuthorizationGraphRepository(localJdbc);var port=new RecordingPort(new JdbcAuthorizationRefreshRepository(localJdbc,new DataSourceTransactionManager(ds),graph,new AuthorizationSnapshotCompiler(),IDS,Clock.systemUTC()));return new ExecutorBundle(localJdbc,new AuthorizationCommandExecutor(port,batch,IDS::generate,Clock.systemUTC()));}
    private static DriverManagerDataSource source(){return new DriverManagerDataSource(url,user,"");}
    private static long revision(UUID id){return jdbc.queryForObject("select authz_revision from mb_user where id=?",Long.class,id);}
    private static void assertNoWaitingLocks(){assertThat(jdbc.queryForObject("select count(*) from pg_locks l join pg_database d on d.oid=l.database where d.datname=current_database() and not l.granted",Integer.class)).isZero();}
    private static String phase(UUID operation){return jdbc.queryForObject("select recovery_phase from mb_authz_refresh_outbox where operation_id=?",String.class,operation);}
    private static AuthorizationRefreshService.AuthorizationChange<Integer> change(UUID user,java.util.function.Supplier<Integer> mutation){return new AuthorizationRefreshService.AuthorizationChange<>(){public Set<UUID> affectedUserIds(){return Set.of(user);}public Integer mutate(){return mutation.get();}};}
    private static void await(CountDownLatch latch){try{latch.await();}catch(InterruptedException e){Thread.currentThread().interrupt();throw new IllegalStateException(e);}}
    private static final class RecordingPort implements AuthorizationRefreshPort {final AuthorizationRefreshPort delegate;RecordingPort(AuthorizationRefreshPort delegate){this.delegate=delegate;}public <T>T inTransaction(TransactionWork<T>w){return delegate.inTransaction(w);}public void lockAuthzGraph(){delegate.lockAuthzGraph();}public Map<UUID,Long> revisions(Set<UUID>u){return delegate.revisions(u);}public Map<UUID,Long> incrementRevisions(Set<UUID>u){return delegate.incrementRevisions(u);}public void appendRefreshOutbox(UUID o,Map<UUID,Long>r,AuthorizationRefreshService.Cause c){delegate.appendRefreshOutbox(o,r,c);}public void appendTerminalOutbox(UUID o,Map<UUID,Long>r,AuthorizationRefreshService.TerminalAction a){delegate.appendTerminalOutbox(o,r,a);}public Map<UUID,AuthorizationSnapshot> compileSnapshots(Set<UUID>u){return delegate.compileSnapshots(u);}public void markDone(UUID o,Set<UUID>u){delegate.markDone(o,u);}}
    private record ExecutorBundle(JdbcTemplate jdbc,AuthorizationCommandExecutor executor){}
    private static final class RecordingBatch implements AuthorizationBatchSnapshotStore {final List<Long> targets;RecordingBatch(List<Long>targets){this.targets=targets;}public synchronized Set<UUID> fenceAll(UUID op,Map<UUID,Long>values,Instant at){targets.addAll(values.values());return values.keySet();}public boolean readyAll(UUID op,Map<UUID,AuthorizationSnapshot>s){return true;}public void compensate(UUID op,Map<UUID,AuthorizationSnapshot>s){}public boolean terminalDelete(UUID op,UUID user,long revision){return true;}}
    private static final class CountingTokens implements RefreshTokenStore {int calls;public String issue(UUID u){return "";}public RefreshRotationOutcome rotate(String t){return RefreshRotationOutcome.rejected();}public void revoke(String t){}public void revokeAll(UUID u){calls++;}}
    private static final class FailingOnceSessions implements AccountSessionPort {int calls;public AccessSession login(UUID u,long revision){return null;}public void logoutToken(String t){}public void kickoutAll(UUID u){if(calls++==0)throw new IllegalStateException("kickout");}}
    private static final class FailingOnceDelete implements AuthorizationBatchSnapshotStore {int calls;public Set<UUID> fenceAll(UUID op,Map<UUID,Long>t,Instant at){return t.keySet();}public boolean readyAll(UUID op,Map<UUID,AuthorizationSnapshot>s){return true;}public void compensate(UUID op,Map<UUID,AuthorizationSnapshot>s){}public boolean terminalDelete(UUID op,UUID u,long r){return calls++>0;}}
    private static final class MissingSnapshots implements AuthorizationSnapshotStore {public boolean initializeReady(AuthorizationSnapshot s){return false;}public com.metabuild.shared.kernel.security.AuthorizationState load(UUID u){return null;}public boolean fence(com.metabuild.shared.kernel.security.AuthorizationFence f){return false;}public boolean deleteIfFence(com.metabuild.shared.kernel.security.AuthorizationFence f){return false;}public void delete(UUID u){}}
}
