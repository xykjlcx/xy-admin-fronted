package com.metabuild.modules.admin.auth.application;

import com.metabuild.shared.kernel.UuidV7;
import java.util.List;
import java.util.UUID;

public record AuthorizationGraph(UUID userId, long revision, UUID ownDeptId, List<AuthorizationGrant> grants) {
    public AuthorizationGraph {
        userId = UuidV7.require(userId);
        if (revision < 0) throw new IllegalArgumentException("revision must not be negative");
        if (ownDeptId != null) ownDeptId = UuidV7.require(ownDeptId);
        grants = List.copyOf(grants);
    }
}
