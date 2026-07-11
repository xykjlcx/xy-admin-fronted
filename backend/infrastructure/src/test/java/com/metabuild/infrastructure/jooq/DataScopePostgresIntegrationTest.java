package com.metabuild.infrastructure.jooq;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import com.metabuild.shared.kernel.security.DataScopePolicy;
import java.sql.DriverManager;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.jooq.SQLDialect;
import org.jooq.impl.DSL;
import org.jooq.impl.DefaultConfiguration;
import org.junit.jupiter.api.Test;

class DataScopePostgresIntegrationTest {
    private static final UUID USER = UUID.fromString("01900000-0000-7000-8000-000000000001");
    private static final UUID OTHER = UUID.fromString("01900000-0000-7000-8000-000000000002");
    private static final UUID DEPT = UUID.fromString("01900000-0000-7000-8000-000000000003");
    private static final UUID OTHER_DEPT = UUID.fromString("01900000-0000-7000-8000-000000000004");

    @Test void executesDepartmentSelfUnionAndDenyAllAgainstPostgres() throws Exception {
        String url = System.getenv().getOrDefault("TASK17_POSTGRES_URL",
                "jdbc:postgresql://127.0.0.1:5432/postgres?user=" + System.getProperty("user.name"));
        try (var connection = DriverManager.getConnection(url)) {
            var bootstrap = DSL.using(connection, SQLDialect.POSTGRES);
            bootstrap.execute("drop table if exists task17_order");
            bootstrap.execute("create table task17_order(id uuid primary key, owner_dept_id uuid not null, created_by uuid not null)");
            bootstrap.execute("insert into task17_order values (?, ?, ?), (?, ?, ?), (?, ?, ?)",
                    uuid(10), DEPT, OTHER, uuid(11), OTHER_DEPT, USER, uuid(12), OTHER_DEPT, OTHER);
            try {
                assertThat(count(connection, new DataScopePolicy(false, false, Set.of(DEPT)))).isEqualTo(1);
                assertThat(count(connection, new DataScopePolicy(false, true, Set.of()))).isEqualTo(1);
                assertThat(count(connection, new DataScopePolicy(false, true, Set.of(DEPT)))).isEqualTo(2);
                assertThat(count(connection, DataScopePolicy.denyAll())).isZero();
                assertThat(count(connection, DataScopePolicy.allAccess())).isEqualTo(3);
                assertComplexQueries(connection);
            } finally {
                bootstrap.execute("drop table if exists task17_order");
            }
        }
    }

    @Test void systemExecutorPersistsAttemptBeforeBypassAndRecordsFailureOutcome() throws Exception {
        String url=System.getenv().getOrDefault("TASK17_POSTGRES_URL","jdbc:postgresql://127.0.0.1:5432/postgres?user="+System.getProperty("user.name"));
        try(var connection=DriverManager.getConnection(url)){
            var sql=DSL.using(connection,SQLDialect.POSTGRES);
            sql.execute("drop table if exists mb_operation_log");
            sql.execute("create table mb_operation_log(id uuid primary key,actor_id uuid,operation varchar(160),resource_type varchar(96),resource_id uuid,request_method varchar(16),request_path varchar(1024),success boolean not null,detail jsonb not null,trace_id varchar(64),created_at timestamptz default now())");
            try{
                var ds=new org.springframework.jdbc.datasource.SingleConnectionDataSource(connection,true);
                var tx=new org.springframework.jdbc.datasource.DataSourceTransactionManager(ds);
                var audit=new JdbcSystemDataScopeAuditAdapter(new org.springframework.jdbc.core.JdbcTemplate(ds),new com.metabuild.shared.kernel.UuidV7Generator(),tx);
                var executor=new SystemDataScopeExecutor(new com.metabuild.infrastructure.security.InternalSystemTaskAuthority(()->true,USER),audit);
                var outer=new org.springframework.transaction.support.TransactionTemplate(tx);
                assertThatThrownBy(()->outer.execute(status->executor.execute("reconcile",()->{
                    assertThat(sql.fetchCount(DSL.table("mb_operation_log"))).isEqualTo(1);
                    throw new IllegalStateException("action-failed");
                }))).hasMessage("action-failed");
                var row=sql.fetchOne("select success,detail->>'status',detail->>'outcome' from mb_operation_log");
                assertThat(row.get(0,Boolean.class)).isFalse();
                assertThat(row.get(1,String.class)).isEqualTo("ATTEMPTED");
                assertThat(row.get(2,String.class)).isEqualTo("IllegalStateException");
            }finally{sql.execute("drop table if exists mb_operation_log");}
        }
    }

    private static void assertComplexQueries(java.sql.Connection connection) {
        var dsl = scopedDsl(connection, new DataScopePolicy(false, false, Set.of(DEPT)));
        var orders = DSL.table("task17_order");
        var o = orders.as("o");
        var i = orders.as("i");
        assertThat(dsl.fetchCount(o)).isEqualTo(1);
        assertThat(dsl.selectCount().from(o.join(i).on(DSL.trueCondition())).fetchOne(0, int.class)).isEqualTo(1);
        assertThat(dsl.selectCount().from(o).whereExists(DSL.selectOne().from(i)).fetchOne(0, int.class)).isEqualTo(1);
        var cte = DSL.name("visible").as(DSL.selectFrom(orders));
        assertThat(dsl.with(cte).selectCount().from(cte).fetchOne(0, int.class)).isEqualTo(1);
        assertThatThrownBy(() -> dsl.select().from(o.leftJoin(i).on(DSL.trueCondition())).fetch())
                .isInstanceOf(DataScopeUnsupportedQueryException.class);
    }

    private static int count(java.sql.Connection connection, DataScopePolicy policy) {
        return scopedDsl(connection, policy).fetchCount(DSL.table("task17_order"));
    }

    private static org.jooq.DSLContext scopedDsl(java.sql.Connection connection, DataScopePolicy policy) {
        var registry = new DataScopeRegistry(List.of(new DataScopeRegistry.Scoped(
                "task17_order", "owner_dept_id", "created_by", com.metabuild.infrastructure.jooq.persistence.scoped.TestScopedOwner.class)));
        var snapshot = new AuthorizationSnapshot(USER, 1, false, Set.of(), Set.of(), policy, Instant.EPOCH);
        var configuration = new DefaultConfiguration();
        configuration.set(connection);
        configuration.set(SQLDialect.POSTGRES);
        configuration.setVisitListenerProvider(() -> new DataScopeVisitListener(
                registry, () -> new DataScopeAccess.Ready(snapshot), DataScopeMetrics.NOOP));
        return DSL.using(configuration);
    }

    private static UUID uuid(long suffix) {
        return UUID.fromString("01900000-0000-7000-8000-" + String.format("%012d", suffix));
    }
}
