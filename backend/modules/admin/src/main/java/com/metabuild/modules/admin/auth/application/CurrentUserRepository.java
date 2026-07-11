package com.metabuild.modules.admin.auth.application;

import java.util.UUID;

public interface CurrentUserRepository {
    UserIdentity find(UUID userId);
    record UserIdentity(UUID id, String name, String username) {}
}
