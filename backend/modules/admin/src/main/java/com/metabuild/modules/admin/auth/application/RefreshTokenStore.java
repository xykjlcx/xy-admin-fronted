package com.metabuild.modules.admin.auth.application;

import java.util.UUID;

public interface RefreshTokenStore {
    String issue(UUID userId);
    default String issue(UUID userId,long credentialRevision){return issue(userId);}
    RefreshRotationOutcome rotate(String token);
    void revoke(String token);
    default void revokeFamily(String token){revoke(token);}
    void revokeAll(UUID userId);
}
