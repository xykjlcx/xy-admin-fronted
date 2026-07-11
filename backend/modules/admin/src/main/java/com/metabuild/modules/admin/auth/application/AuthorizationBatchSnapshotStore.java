package com.metabuild.modules.admin.auth.application;

import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Redis 授权状态的有界批量原语；实现必须用 pipeline，不得按 session/device 扫描。 */
public interface AuthorizationBatchSnapshotStore {
    Set<UUID> fenceAll(UUID operationId, Map<UUID, Long> targetRevisions, Instant fencedAt);
    boolean readyAll(UUID operationId, Map<UUID, AuthorizationSnapshot> snapshots);
    void compensate(UUID operationId, Map<UUID, AuthorizationSnapshot> preimage);
    boolean terminalDelete(UUID operationId, UUID userId, long targetRevision);
    default boolean initializeAll(Map<UUID,AuthorizationSnapshot> snapshots){return false;}
}
