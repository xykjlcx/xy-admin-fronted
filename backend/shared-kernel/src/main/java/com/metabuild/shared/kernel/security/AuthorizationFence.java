package com.metabuild.shared.kernel.security;

import com.metabuild.shared.kernel.UuidV7;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public record AuthorizationFence(
        UUID userId, long targetRevision, UUID operationId, Instant fencedAt)
        implements AuthorizationState {

    public AuthorizationFence {
        userId = UuidV7.require(userId);
        if (targetRevision < 0) {
            throw new IllegalArgumentException("targetRevision must not be negative");
        }
        operationId = UuidV7.require(operationId);
        fencedAt = Objects.requireNonNull(fencedAt, "fencedAt");
    }
}
