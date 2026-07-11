package com.metabuild.modules.admin.auth.application;

import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public final class RequestAuthorizationLoader {
    private final AuthorizationSnapshotStore store;
    public RequestAuthorizationLoader(AuthorizationSnapshotStore store) { this.store = store; }
    public RequestScope newRequest() { return new RequestScope(); }

    public final class RequestScope {
        private final Map<UUID, AuthorizationSnapshot> loaded = new HashMap<>();
        public AuthorizationSnapshot load(UUID userId) {
            var existing = loaded.get(userId);
            if (existing != null) return existing;
            var state = store.load(userId);
            if (!(state instanceof AuthorizationSnapshot snapshot)) throw new AuthorizationUnavailable();
            loaded.put(userId, snapshot);
            return snapshot;
        }
    }
}
