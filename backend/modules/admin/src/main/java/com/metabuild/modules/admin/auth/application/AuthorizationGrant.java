package com.metabuild.modules.admin.auth.application;

import java.util.Objects;
import java.util.Set;
import java.util.UUID;

public record AuthorizationGrant(
        String roleCode,
        boolean systemAdmin,
        ScopeType scopeType,
        Set<UUID> scopeDeptIds,
        Set<String> permissions) {
    public AuthorizationGrant {
        roleCode = Objects.requireNonNull(roleCode, "roleCode");
        scopeType = Objects.requireNonNull(scopeType, "scopeType");
        scopeDeptIds = Set.copyOf(scopeDeptIds);
        permissions = Set.copyOf(permissions);
    }
}
