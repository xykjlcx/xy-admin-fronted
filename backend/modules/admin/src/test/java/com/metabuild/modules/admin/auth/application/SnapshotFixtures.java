package com.metabuild.modules.admin.auth.application;

import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import com.metabuild.shared.kernel.security.DataScopePolicy;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

final class SnapshotFixtures {
    private SnapshotFixtures() {}
    static AuthorizationSnapshot ready(UUID userId,long revision){return new AuthorizationSnapshot(userId,revision,false,Set.of(),Set.of(),new DataScopePolicy(false,false,Set.of()),Instant.EPOCH);}
}
