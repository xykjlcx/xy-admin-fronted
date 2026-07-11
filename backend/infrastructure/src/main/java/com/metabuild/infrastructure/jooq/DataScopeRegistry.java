package com.metabuild.infrastructure.jooq;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.jooq.Field;
import org.jooq.Table;

/**
 * 数据权限表注册表。表名使用 generated schema 中的非限定名，并在启动期做完备性校验。
 */
public final class DataScopeRegistry {
    public sealed interface Rule permits Scoped, Whitelisted { String tableName(); }
    public record Scoped(String tableName, String departmentColumn, String creatorColumn, Class<?> repositoryOwner) implements Rule {
        public Scoped {
            requireName(tableName, "tableName");
            requireName(departmentColumn, "departmentColumn");
            requireName(creatorColumn, "creatorColumn");
            Objects.requireNonNull(repositoryOwner, "repositoryOwner");
        }
    }
    public record Whitelisted(String tableName, String reason) implements Rule {
        public Whitelisted {
            requireName(tableName, "tableName");
            requireName(reason, "reason");
        }
    }

    private final Map<String, Rule> rules;

    public DataScopeRegistry(Collection<? extends Rule> rules) {
        Objects.requireNonNull(rules, "rules");
        var indexed = new LinkedHashMap<String, Rule>();
        for (Rule rule : rules) {
            Rule old = indexed.put(rule.tableName(), rule);
            if (old != null) throw new IllegalArgumentException("Duplicate data-scope table: " + rule.tableName());
        }
        this.rules = Map.copyOf(indexed);
    }

    public Optional<Rule> rule(String tableName) { return Optional.ofNullable(rules.get(tableName)); }
    public Collection<Rule> rules() { return rules.values(); }

    public Optional<ScopedFields> scopedFields(Table<?> occurrence) {
        Rule rule = null;
        Table<?> candidate = occurrence;
        while (candidate != null && rule == null) {
            rule = rules.get(candidate.getUnqualifiedName().last());
            candidate = candidate instanceof org.jooq.impl.QOM.TableAlias<?> alias ? alias.$table() : null;
        }
        if (!(rule instanceof Scoped scoped)) return Optional.empty();
        Field<?> dept = occurrence.field(scoped.departmentColumn());
        Field<?> creator = occurrence.field(scoped.creatorColumn());
        if (dept == null) dept = org.jooq.impl.DSL.field(
                org.jooq.impl.DSL.name(occurrence.getUnqualifiedName().last(), scoped.departmentColumn()), UUID.class);
        if (creator == null) creator = org.jooq.impl.DSL.field(
                org.jooq.impl.DSL.name(occurrence.getUnqualifiedName().last(), scoped.creatorColumn()), UUID.class);
        @SuppressWarnings("unchecked") Field<UUID> uuidDept = (Field<UUID>) dept;
        @SuppressWarnings("unchecked") Field<UUID> uuidCreator = (Field<UUID>) creator;
        return Optional.of(new ScopedFields(uuidDept, uuidCreator));
    }

    public record ScopedFields(Field<UUID> department, Field<UUID> creator) { }

    private static void requireName(String value, String label) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(label + " must not be blank");
    }
}
