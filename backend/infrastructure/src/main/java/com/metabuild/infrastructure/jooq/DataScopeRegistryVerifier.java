package com.metabuild.infrastructure.jooq;

import java.util.Collection;
import java.util.HashSet;
import java.util.UUID;
import org.jooq.Field;
import org.jooq.Table;
import org.springframework.beans.factory.InitializingBean;

/** Spring 启动期完备性校验；成功后热路径不再报配置错误。 */
public final class DataScopeRegistryVerifier implements InitializingBean {
    private final DataScopeRegistry registry;
    private final Collection<Table<?>> generatedTables;

    public DataScopeRegistryVerifier(DataScopeRegistry registry, Collection<Table<?>> generatedTables) {
        this.registry = registry;
        this.generatedTables = ListCopy.copy(generatedTables);
    }

    @Override public void afterPropertiesSet() {
        var generated = new HashSet<String>();
        for (Table<?> table : generatedTables) {
            String name = table.getUnqualifiedName().last();
            generated.add(name);
            var rule = registry.rule(name).orElseThrow(() ->
                    new IllegalStateException("Generated table is absent from DataScopeRegistry: " + name));
            if (rule instanceof DataScopeRegistry.Scoped scoped) {
                requireUuid(table, scoped.departmentColumn());
                requireUuid(table, scoped.creatorColumn());
                var owner = scoped.repositoryOwner().getAnnotation(
                        com.metabuild.shared.kernel.security.DataScopedPersistence.class);
                if (!scoped.repositoryOwner().getPackageName().contains(".persistence.scoped")) {
                    throw new IllegalStateException("Scoped repository owner must be in a controlled persistence.scoped package: " + name);
                }
                if (owner == null || java.util.Arrays.stream(owner.tables()).noneMatch(name::equals)) {
                    throw new IllegalStateException("Scoped repository owner is not bound to table: " + name);
                }
            }
        }
        for (DataScopeRegistry.Rule rule : registry.rules()) {
            if (!generated.contains(rule.tableName())) {
                throw new IllegalStateException("DataScopeRegistry references unknown generated table: " + rule.tableName());
            }
        }
    }

    private static void requireUuid(Table<?> table, String column) {
        Field<?> field = table.field(column);
        if (field == null) throw new IllegalStateException("DataScopeRegistry column missing: " + table.getName() + "." + column);
        if (field.getDataType().getType() != UUID.class) {
            throw new IllegalStateException("DataScopeRegistry column must be UUID: " + table.getName() + "." + column);
        }
    }

    private static final class ListCopy {
        static <T> Collection<T> copy(Collection<T> source) { return java.util.List.copyOf(source); }
    }
}
