package com.metabuild.modules.admin.auth.application;

import java.util.UUID;

public interface RefreshTokenStore {
    String issue(UUID userId);
    RefreshRotationOutcome rotate(String token);
    void revoke(String token);
    void revokeAll(UUID userId);
}
