package com.metabuild.modules.admin.auth.application;

import java.time.Clock;
import java.util.UUID;

final class InMemoryRefreshTokenStore implements RefreshTokenStore {
    private final Clock clock;
    String issued;
    String revoked;
    InMemoryRefreshTokenStore(Clock clock) { this.clock = clock; }
    @Override public String issue(UUID userId) { issued = userId + "." + clock.instant().toEpochMilli() + "." + UUID.randomUUID(); return issued; }
    @Override public RefreshRotationOutcome rotate(String token) { throw new UnsupportedOperationException(); }
    @Override public void revoke(String token) { revoked = token; }
    @Override public void revokeAll(UUID userId) {}
}
