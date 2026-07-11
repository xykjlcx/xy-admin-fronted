package com.metabuild.modules.admin.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.metabuild.modules.admin.auth.api.AuthorizationRefreshService;
import com.metabuild.modules.admin.auth.persistence.JdbcAuthorizationGraphRepository;
import com.metabuild.modules.admin.auth.persistence.JdbcAuthorizationRefreshRepository;
import com.metabuild.modules.admin.auth.persistence.JdbcAuthorizationReconciliationRepository;
import com.metabuild.modules.admin.auth.persistence.JdbcRefreshTokenStore;
import com.metabuild.schema.platform.PlatformFlywayRunner;
import com.metabuild.shared.kernel.UuidV7Generator;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.time.Duration;
import java.util.concurrent.Executors;
import java.util.concurrent.CountDownLatch;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class AuthorizationCommandPostgresTest {
    static JdbcTemplate jdbc;static AuthorizationCommandExecutor executor;static RecordingBatch batch;static DriverManagerDataSource ds;
    static final UUID ADMIN=UUID.fromString("01900000-0000-7000-8000-000000000010");
    @BeforeAll static void setup(){String url=System.getProperty("task16.pg.url");Assumptions.assumeTrue(url!=null);ds=new DriverManagerDataSource(url,System.getProperty("task16.pg.user","ocean"),"");PlatformFlywayRunner.migrate(ds);jdbc=new JdbcTemplate(ds);var clock=Clock.systemUTC();var graph=new JdbcAuthorizationGraphRepository(jdbc);var port=new JdbcAuthorizationRefreshRepository(jdbc,new DataSourceTransactionManager(ds),graph,new AuthorizationSnapshotCompiler(),new UuidV7Generator(),clock);batch=new RecordingBatch();executor=new AuthorizationCommandExecutor(port,batch,new UuidV7Generator()::generate,clock);}
    @Test void realTransactionCommitsRevisionAndOutboxTogether(){long before=revision();int done=jdbc.queryForObject("select count(*) from mb_authz_refresh_outbox where user_id=? and status='DONE'",Integer.class,ADMIN);executor.execute(AuthorizationRefreshService.Cause.USER_CHANGED,change(()->jdbc.update("update mb_user set display_name='Task16' where id=?",ADMIN)));assertThat(revision()).isEqualTo(before+1);assertThat(jdbc.queryForObject("select count(*) from mb_authz_refresh_outbox where user_id=? and status='DONE'",Integer.class,ADMIN)).isEqualTo(done+1);}
    @Test void realRollbackLeavesRevisionAndOutboxUntouchedAndCompensatesFence(){long before=revision();int outbox=jdbc.queryForObject("select count(*) from mb_authz_refresh_outbox",Integer.class);assertThatThrownBy(()->executor.execute(AuthorizationRefreshService.Cause.USER_CHANGED,change(()->{jdbc.update("update mb_user set display_name='rollback' where id=?",ADMIN);throw new IllegalStateException("fail");}))).isInstanceOf(IllegalStateException.class);assertThat(revision()).isEqualTo(before);assertThat(jdbc.queryForObject("select count(*) from mb_authz_refresh_outbox",Integer.class)).isEqualTo(outbox);assertThat(batch.compensations).isPositive();}
    @Test void realPostgresReclaimsExpiredLeaseAndRejectsOldWorkerAba(){
        UUID id=UUID.randomUUID(),op=UUID.randomUUID(),firstWorker=UUID.randomUUID(),secondWorker=UUID.randomUUID();
        jdbc.update("insert into mb_authz_refresh_outbox(id,operation_id,user_id,target_revision,event_type,status,recovery_payload) values(?,?,?,?, 'REFRESH','PENDING','{}'::jsonb)",id,op,ADMIN,revision()+1);
        var repo=new JdbcAuthorizationReconciliationRepository(jdbc,Clock.systemUTC());
        var first=repo.claim(firstWorker,1,Duration.ofSeconds(30)).getFirst();
        jdbc.update("update mb_authz_refresh_outbox set claimed_at=current_timestamp-interval '2 minutes',lease_until=current_timestamp-interval '1 minute' where id=?",id);
        var second=repo.claim(secondWorker,1,Duration.ofSeconds(30)).getFirst();
        assertThat(second.attempt()).isEqualTo(first.attempt()+1);
        assertThat(repo.complete(first)).isFalse();assertThat(repo.failed(first,"late")).isFalse();
        assertThat(repo.complete(second)).isTrue();
    }
    @Test void oldRefreshTokenNeverRevivesAfterDisableAndEnable(){
        var manager=new DataSourceTransactionManager(ds);var tokens=new JdbcRefreshTokenStore(jdbc,manager,new UuidV7Generator(),Clock.systemUTC(),Duration.ofDays(1));
        String old=tokens.issue(ADMIN);var port=new JdbcAuthorizationRefreshRepository(jdbc,manager,new JdbcAuthorizationGraphRepository(jdbc),new AuthorizationSnapshotCompiler(),new UuidV7Generator(),Clock.systemUTC());
        AccountSessionPort sessions=new AccountSessionPort(){public AccessSession login(UUID u){return null;}public void logoutToken(String t){}public void kickoutAll(UUID u){}};
        var terminal=new AuthorizationCommandExecutor(port,batch,new UuidV7Generator()::generate,Clock.systemUTC(),tokens,sessions);
        terminal.executeTerminal(new AuthorizationRefreshService.TerminalChange<>(){public Set<UUID> affectedUserIds(){return Set.of(ADMIN);}public Integer mutate(){return jdbc.update("update mb_user set status='DISABLED' where id=?",ADMIN);}public AuthorizationRefreshService.TerminalAction terminalAction(){return AuthorizationRefreshService.TerminalAction.DISABLE_ACCOUNT;}});
        terminal.executeEnable(new AuthorizationRefreshService.AuthorizationChange<>(){public Set<UUID> affectedUserIds(){return Set.of(ADMIN);}public Integer mutate(){return jdbc.update("update mb_user set status='ACTIVE' where id=?",ADMIN);}});
        assertThat(tokens.rotate(old).status()).isEqualTo(RefreshRotationOutcome.Status.REJECTED);
    }
    @Test void twoRealWorkersCannotClaimTheSameOutboxRow() throws Exception {
        jdbc.update("delete from mb_authz_refresh_outbox");UUID id=UUID.randomUUID(),op=UUID.randomUUID();
        jdbc.update("insert into mb_authz_refresh_outbox(id,operation_id,user_id,target_revision,event_type,status,recovery_payload) values(?,?,?,?, 'REFRESH','PENDING','{}'::jsonb)",id,op,ADMIN,revision()+1);
        var gate=new CountDownLatch(1);try(var pool=Executors.newFixedThreadPool(2)){
            var one=pool.submit(()->{gate.await();return new JdbcAuthorizationReconciliationRepository(new JdbcTemplate(ds),Clock.systemUTC()).claim(UUID.randomUUID(),1,Duration.ofSeconds(30));});
            var two=pool.submit(()->{gate.await();return new JdbcAuthorizationReconciliationRepository(new JdbcTemplate(ds),Clock.systemUTC()).claim(UUID.randomUUID(),1,Duration.ofSeconds(30));});
            gate.countDown();assertThat(one.get().size()+two.get().size()).isOne();
        }
    }
    private static AuthorizationRefreshService.AuthorizationChange<Integer> change(java.util.function.Supplier<Integer> mutation){return new AuthorizationRefreshService.AuthorizationChange<>(){public Set<UUID> affectedUserIds(){return Set.of(ADMIN);}public Integer mutate(){return mutation.get();}};}
    private static long revision(){return jdbc.queryForObject("select authz_revision from mb_user where id=?",Long.class,ADMIN);}
    static final class RecordingBatch implements AuthorizationBatchSnapshotStore {int compensations;public Set<UUID> fenceAll(UUID op,Map<UUID,Long> t,Instant at){return t.keySet();}public boolean readyAll(UUID op,Map<UUID,AuthorizationSnapshot>s){return true;}public void compensate(UUID op,Map<UUID,AuthorizationSnapshot>s){compensations++;}public boolean terminalDelete(UUID op,UUID u,long r){return true;}public boolean initializeAll(Map<UUID,AuthorizationSnapshot>s){return true;}}
}
