package com.metabuild.modules.admin.auth.application;

import java.util.UUID;

public interface AccountSessionPort {
    AccessSession login(UUID userId);
    void logoutToken(String token);
    void kickoutAll(UUID userId);
    default UUID currentUserId() { return null; }
}
