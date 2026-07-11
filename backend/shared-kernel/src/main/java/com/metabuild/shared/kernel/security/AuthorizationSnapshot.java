package com.metabuild.shared.kernel.security;

import com.metabuild.shared.kernel.UuidV7;
import java.time.Instant;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

public record AuthorizationSnapshot(
        UUID userId,
        long revision,
        boolean systemAdmin,
        Set<String> roles,
        Set<String> permissions,
        DataScopePolicy dataScope,
        Instant calculatedAt)
        implements AuthorizationState {

    public AuthorizationSnapshot {
        userId = UuidV7.require(userId);
        if (revision < 0) {
            throw new IllegalArgumentException("revision must not be negative");
        }
        roles = Set.copyOf(Objects.requireNonNull(roles, "roles"));
        permissions = Set.copyOf(Objects.requireNonNull(permissions, "permissions"));
        dataScope = Objects.requireNonNull(dataScope, "dataScope");
        calculatedAt = Objects.requireNonNull(calculatedAt, "calculatedAt");
    }
}
