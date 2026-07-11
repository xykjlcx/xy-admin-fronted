package com.metabuild.infrastructure.jooq;

import java.util.Objects;
import java.util.concurrent.Callable;

/** 唯一对外 bypass 入口：安全门面 capability + 固定审计端口。 */
public final class SystemDataScopeExecutor {
    private final SystemPrincipalAuthority authority;
    private final SystemDataScopeAuditPort audit;

    public SystemDataScopeExecutor(SystemPrincipalAuthority authority, SystemDataScopeAuditPort audit) {
        this.authority = Objects.requireNonNull(authority, "authority");
        this.audit = Objects.requireNonNull(audit, "audit");
    }

    public <T> T execute(String reason, Callable<T> action) {
        if (reason == null || reason.isBlank()) throw new IllegalArgumentException("System bypass reason must not be blank");
        Objects.requireNonNull(action, "action");
        com.metabuild.infrastructure.security.SystemTaskIdentity identity = Objects.requireNonNull(
                authority.requireSystemPrincipal(), "System principal capability must not be null");
        java.util.UUID auditId = audit.begin(reason, identity);
        try {
            T result = DataScopeBypass.run(action);
            audit.complete(auditId, true, "COMPLETED");
            return result;
        } catch (RuntimeException failure) {
            audit.complete(auditId, false, failure.getClass().getSimpleName());
            throw failure;
        } catch (Exception failure) {
            audit.complete(auditId, false, failure.getClass().getSimpleName());
            throw new IllegalStateException("System data-scope action failed", failure);
        }
    }
}
