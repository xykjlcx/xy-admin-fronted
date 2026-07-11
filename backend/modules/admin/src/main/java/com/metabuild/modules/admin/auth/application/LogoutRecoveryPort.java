package com.metabuild.modules.admin.auth.application;

import com.metabuild.shared.kernel.security.AuthorizationFence;

@FunctionalInterface
public interface LogoutRecoveryPort {
    void record(AuthorizationFence fence, RuntimeException failure);
    default void advance(AuthorizationFence fence, String phase) {}
    default void complete(AuthorizationFence fence) {}
}
