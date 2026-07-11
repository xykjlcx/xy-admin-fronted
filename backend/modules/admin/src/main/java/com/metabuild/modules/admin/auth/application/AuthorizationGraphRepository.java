package com.metabuild.modules.admin.auth.application;

import java.util.UUID;
import java.util.Set;
import java.util.Map;

@FunctionalInterface
public interface AuthorizationGraphRepository {
    Map<UUID, AuthorizationGraph> loadAll(Set<UUID> userIds);
    default AuthorizationGraph load(UUID userId) {
        AuthorizationGraph graph = loadAll(Set.of(userId)).get(userId);
        if (graph == null) throw new AuthorizationUnavailable();
        return graph;
    }
}
