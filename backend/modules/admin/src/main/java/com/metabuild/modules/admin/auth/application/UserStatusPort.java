package com.metabuild.modules.admin.auth.application;

import java.util.UUID;

@FunctionalInterface
public interface UserStatusPort {
    boolean isEnabled(UUID userId);
}
