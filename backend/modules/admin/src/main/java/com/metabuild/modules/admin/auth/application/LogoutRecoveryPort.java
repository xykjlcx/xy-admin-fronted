package com.metabuild.modules.admin.auth.application;

import com.metabuild.shared.kernel.security.AuthorizationFence;

@FunctionalInterface
public interface LogoutRecoveryPort {
    void record(AuthorizationFence fence, RuntimeException failure);
    default boolean advance(AuthorizationFence fence, String expectedPhase, String nextPhase) { return true; }
    default void complete(AuthorizationFence fence) {}
}
