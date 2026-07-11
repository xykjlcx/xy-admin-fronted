package com.metabuild.infrastructure.jooq;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import com.metabuild.shared.kernel.security.DataScopePolicy;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.jooq.SQLDialect;
import org.jooq.Table;
import org.jooq.conf.ParamType;
import org.jooq.impl.DSL;
import org.jooq.impl.DefaultConfiguration;
import org.jooq.impl.SQLDataType;
import org.junit.jupiter.api.Test;

class DataScopeVisitListenerTest {
    private static final UUID USER = UUID.fromString("01900000-0000-7000-8000-000000000001");
    private static final UUID DEPT = UUID.fromString("01900000-0000-7000-8000-000000000002");
    private static final Table<?> ORDERS = scopedTable("orders");
    private static final Table<?> LINES = scopedTable("lines");
    private static final DataScopeRegistry REGISTRY = new DataScopeRegistry(List.of(
            new DataScopeRegistry.Scoped("orders", "owner_dept_id", "created_by", com.metabuild.infrastructure.jooq.persistence.scoped.TestScopedOwner.class),
            new DataScopeRegistry.Scoped("lines", "owner_dept_id", "created_by", com.metabuild.infrastructure.jooq.persistence.scoped.TestScopedOwner.class)));

    @Test void injectsPureDepartmentWithoutImplicitSelf() {
        String sql = render(DSL.selectFrom(ORDERS), ready(new DataScopePolicy(false, false, Set.of(DEPT))), new ArrayList<>());
        assertThat(sql).contains("owner_dept_id\" in").doesNotContain("created_by\" =");
    }

    @Test void injectsSelfAndDepartmentAsUnionAndDenyAllAsFalse() {
        String union = render(DSL.selectFrom(ORDERS), ready(new DataScopePolicy(false, true, Set.of(DEPT))), new ArrayList<>());
        assertThat(union).contains("owner_dept_id\" in").contains("created_by\" =").contains(" or ");
        assertThat(render(DSL.selectFrom(ORDERS), ready(DataScopePolicy.denyAll()), new ArrayList<>()))
                .contains("where false");
    }

    @Test void allAndUnauthenticatedDoNotAddCondition() {
        assertThat(render(DSL.selectFrom(ORDERS), ready(DataScopePolicy.allAccess()), new ArrayList<>())).doesNotContain(" where ");
        assertThat(render(DSL.selectFrom(ORDERS), DataScopeAccess.Marker.UNAUTHENTICATED, new ArrayList<>())).doesNotContain(" where ");
    }

    @Test void invalidOrThrowingAuthenticatedContextFailsClosedAndEmitsMetric() {
        var metrics = new ArrayList<String>();
        assertThat(render(DSL.selectFrom(ORDERS), DataScopeAccess.Marker.INVALID, metrics)).contains("where false");
        assertThat(metrics).containsOnly("invalid-context");

        var configuration = configuration(() -> { throw new IllegalStateException("broken"); }, metrics);
        assertThat(DSL.using(configuration).renderInlined(DSL.selectFrom(ORDERS))).contains("where false");
        assertThat(metrics).contains("context-exception");
    }

    @Test void supportsAliasesJoinsAndNestedSelects() {
        var o = ORDERS.as("o");
        var l = LINES.as("l");
        String join = render(DSL.select().from(o.join(l).on(DSL.trueCondition())),
                ready(new DataScopePolicy(false, true, Set.of(DEPT))), new ArrayList<>());
        assertThat(join).contains("\"o\".\"owner_dept_id\"").contains("\"l\".\"owner_dept_id\"")
                .contains("\"o\".\"created_by\"").contains("\"l\".\"created_by\"");

        var nested = DSL.selectFrom(ORDERS).whereExists(DSL.selectOne().from(LINES));
        String nestedSql = render(nested, ready(new DataScopePolicy(false, false, Set.of(DEPT))), new ArrayList<>());
        assertThat(count(nestedSql, "owner_dept_id\" in")).isEqualTo(2);

        var cte = DSL.name("scoped_orders").as(DSL.selectFrom(ORDERS));
        String cteSql = render(DSL.with(cte).select().from(cte),
                ready(new DataScopePolicy(false, false, Set.of(DEPT))), new ArrayList<>());
        assertThat(count(cteSql, "owner_dept_id\" in")).isEqualTo(1);
    }

    @Test void rejectsOuterJoinsOverScopedTables() {
        var o = ORDERS.as("o");
        var l = LINES.as("l");
        var joined = o.leftJoin(l).on(DSL.trueCondition());
        assertThatThrownBy(() -> render(DSL.select().from(joined),
                ready(DataScopePolicy.allAccess()), new ArrayList<>()))
                .isInstanceOf(DataScopeUnsupportedQueryException.class);
    }

    @Test void bypassIsAuditedScopedAndDoesNotCrossAsyncThreads() {
        var audit = new ArrayList<String>();
        var executor = new SystemDataScopeExecutor(systemAuthority(), new SystemDataScopeAuditPort() {
            public UUID begin(String reason, com.metabuild.infrastructure.security.SystemTaskIdentity identity){audit.add(reason);return USER;}
            public void complete(UUID id,boolean success,String outcome){}
        });
        executor.execute("reconcile", () -> {
            assertThat(render(DSL.selectFrom(ORDERS), ready(DataScopePolicy.denyAll()), new ArrayList<>())).doesNotContain("where false");
            assertThat(CompletableFuture.supplyAsync(() ->
                    render(DSL.selectFrom(ORDERS), ready(DataScopePolicy.denyAll()), new ArrayList<>())).join())
                    .contains("where false");
            return null;
        });
        assertThat(audit).containsExactly("reconcile");
        assertThat(DataScopeBypass.active()).isFalse();
    }

    private static String render(org.jooq.QueryPart query, DataScopeAccess access, List<String> metrics) {
        return DSL.using(configuration(() -> access, metrics)).renderInlined(query);
    }

    private static DefaultConfiguration configuration(DataScopeAccessProvider access, List<String> metrics) {
        var configuration = new DefaultConfiguration();
        configuration.set(SQLDialect.POSTGRES);
        configuration.settings().withParamType(ParamType.INLINED);
        configuration.setVisitListenerProvider(() -> new DataScopeVisitListener(REGISTRY, access, metrics::add));
        return configuration;
    }

    private static DataScopeAccess.Ready ready(DataScopePolicy policy) {
        return new DataScopeAccess.Ready(new AuthorizationSnapshot(USER, 1, false, Set.of(), Set.of(), policy, Instant.EPOCH));
    }

    private static int count(String text, String part) { return (text.length() - text.replace(part, "").length()) / part.length(); }

    private static SystemPrincipalAuthority systemAuthority() {
        return new com.metabuild.infrastructure.security.InternalSystemTaskAuthority(()->true,USER);
    }

    private static Table<?> scopedTable(String name) {
        return DSL.table(DSL.name(name));
    }
}
