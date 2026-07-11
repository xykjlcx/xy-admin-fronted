package com.metabuild.modules.admin.auth.application;

import com.metabuild.modules.admin.auth.api.AuthorizationRefreshService;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** PostgreSQL 侧授权命令协议。 */
public interface AuthorizationRefreshPort {
    <T> T inTransaction(TransactionWork<T> work);
    default void lockCatalogSeed(){throw new UnsupportedOperationException("Catalog lock is not configured");}
    void lockAuthzGraph();
    Map<UUID, Long> revisions(Set<UUID> userIds);
    Map<UUID, Long> incrementRevisions(Set<UUID> userIds);
    void appendRefreshOutbox(UUID operationId, Map<UUID, Long> revisions, AuthorizationRefreshService.Cause cause);
    void appendTerminalOutbox(UUID operationId, Map<UUID, Long> revisions, AuthorizationRefreshService.TerminalAction action);
    Map<UUID, AuthorizationSnapshot> compileSnapshots(Set<UUID> userIds);
    void markDone(UUID operationId, Set<UUID> userIds);
    @FunctionalInterface interface TransactionWork<T> { T run(); }
}
