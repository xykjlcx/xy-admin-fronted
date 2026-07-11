package com.metabuild.infrastructure.jooq;

import com.metabuild.shared.kernel.security.DataScopePolicy;
import java.util.ArrayList;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.UUID;
import org.jooq.Condition;
import org.jooq.SelectQuery;
import org.jooq.Table;
import org.jooq.VisitContext;
import org.jooq.impl.DSL;
import org.jooq.impl.DefaultVisitListener;
import org.jooq.impl.QOM;

/** 在渲染前修改每个 SelectQuery，因此 CTE/子查询各自注入。 */
public final class DataScopeVisitListener extends DefaultVisitListener {
    private final DataScopeRegistry registry;
    private final DataScopeAccessProvider access;
    private final DataScopeMetrics metrics;
    private final IdentityHashMap<SelectQuery<?>, Boolean> rewritten = new IdentityHashMap<>();

    public DataScopeVisitListener(DataScopeRegistry registry, DataScopeAccessProvider access, DataScopeMetrics metrics) {
        this.registry = registry;
        this.access = access;
        this.metrics = metrics;
    }

    @Override public void visitStart(VisitContext context) {
        if (context.queryPart() instanceof Table<?> table
                && (table instanceof QOM.LeftJoin || table instanceof QOM.RightJoin || table instanceof QOM.FullJoin)
                && containsScoped(table)) {
            throw new DataScopeUnsupportedQueryException(
                    "Outer joins over data-scoped tables are forbidden; use an inner join or split the query");
        }
        if (!(context.queryPart() instanceof SelectQuery<?> select) || rewritten.put(select, Boolean.TRUE) != null) return;
        if (DataScopeBypass.active()) return;
        List<Table<?>> tables = new ArrayList<>();
        select.$from().forEach(table -> collect(table, tables));
        List<DataScopeRegistry.ScopedFields> scoped = tables.stream()
                .map(registry::scopedFields).flatMap(java.util.Optional::stream).toList();
        if (scoped.isEmpty()) return;
        DataScopeAccess state;
        try { state = access.current(); }
        catch (RuntimeException failure) {
            metrics.failClosed("context-exception");
            select.addConditions(DSL.falseCondition());
            return;
        }
        if (state == DataScopeAccess.Marker.UNAUTHENTICATED) return;
        if (!(state instanceof DataScopeAccess.Ready ready)) {
            metrics.failClosed("invalid-context");
            select.addConditions(DSL.falseCondition());
            return;
        }
        DataScopePolicy policy = ready.snapshot().dataScope();
        if (policy.all()) return;
        List<Condition> conditions = new ArrayList<>();
        for (DataScopeRegistry.ScopedFields fields : scoped) {
            conditions.add(condition(fields, ready.snapshot().userId(), policy));
        }
        select.addConditions(conditions);
    }

    private static Condition condition(DataScopeRegistry.ScopedFields fields, UUID userId, DataScopePolicy policy) {
        Condition result = null;
        if (!policy.deptIds().isEmpty()) result = fields.department().in(policy.deptIds());
        if (policy.includeSelf()) result = result == null ? fields.creator().eq(userId) : result.or(fields.creator().eq(userId));
        if (result == null) result = DSL.falseCondition();
        return result;
    }

    private void collect(Table<?> table, List<Table<?>> result) {
        if ((table instanceof QOM.LeftJoin || table instanceof QOM.RightJoin || table instanceof QOM.FullJoin)
                && containsScoped(table)) {
            throw new DataScopeUnsupportedQueryException(
                    "Outer joins over data-scoped tables are forbidden; use an inner join or split the query");
        }
        if (table instanceof QOM.JoinTable<?, ?> join) {
            collect(join.$table1(), result);
            collect(join.$table2(), result);
        } else {
            result.add(table);
        }
    }

    private boolean containsScoped(Table<?> table) {
        if (table instanceof QOM.JoinTable<?, ?> join) {
            return containsScoped(join.$table1()) || containsScoped(join.$table2());
        }
        return registry.scopedFields(table).isPresent();
    }
}
