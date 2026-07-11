package com.metabuild.modules.admin.auth.application;

import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import com.metabuild.shared.kernel.security.DataScopePolicy;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

public final class AuthorizationSnapshotCompiler {
    public AuthorizationSnapshot compile(AuthorizationGraph graph, Instant calculatedAt) {
        var roles = new HashSet<String>();
        var permissions = new HashSet<String>();
        var deptIds = new HashSet<UUID>();
        boolean systemAdmin = false;
        boolean all = false;
        boolean includeSelf = false;

        for (var grant : graph.grants()) {
            roles.add(grant.roleCode());
            permissions.addAll(grant.permissions());
            systemAdmin |= grant.systemAdmin();
            switch (grant.scopeType()) {
                case ALL -> all = true;
                case SELF -> includeSelf = true;
                case OWN_DEPT -> { if (graph.ownDeptId() != null) deptIds.add(graph.ownDeptId()); }
                case OWN_DEPT_AND_BELOW, CUSTOM_DEPT -> deptIds.addAll(grant.scopeDeptIds());
            }
        }
        if (systemAdmin) all = true;
        var scope = all ? DataScopePolicy.allAccess() : new DataScopePolicy(false, includeSelf, deptIds);
        return new AuthorizationSnapshot(graph.userId(), graph.revision(), systemAdmin,
                Set.copyOf(roles), Set.copyOf(permissions), scope, calculatedAt);
    }
}
