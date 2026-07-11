package com.metabuild.modules.admin.auth.application;

import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import com.metabuild.shared.kernel.security.AuthorizationState;
import com.metabuild.shared.kernel.security.AuthorizationFence;
import java.util.UUID;

public interface AuthorizationSnapshotStore {
    boolean initializeReady(AuthorizationSnapshot snapshot);
    AuthorizationState load(UUID userId);
    boolean fence(AuthorizationFence fence);
    boolean deleteIfFence(AuthorizationFence fence);
    void delete(UUID userId);
}
