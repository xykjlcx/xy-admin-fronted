package com.metabuild.shared.kernel.security;

import com.metabuild.shared.kernel.UuidV7;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

public record DataScopePolicy(boolean all, boolean includeSelf, Set<UUID> deptIds) {

    private static final DataScopePolicy ALL = new DataScopePolicy(true, false, Set.of());
    private static final DataScopePolicy DENY_ALL = new DataScopePolicy(false, false, Set.of());

    public DataScopePolicy {
        Objects.requireNonNull(deptIds, "deptIds");
        if (all) {
            includeSelf = false;
            deptIds = Set.of();
        } else {
            deptIds = Set.copyOf(deptIds);
            deptIds.forEach(UuidV7::require);
        }
    }

    public static DataScopePolicy allAccess() {
        return ALL;
    }

    public static DataScopePolicy denyAll() {
        return DENY_ALL;
    }

    public DataScopePolicy union(DataScopePolicy other) {
        Objects.requireNonNull(other, "other");
        if (all || other.all) {
            return ALL;
        }

        Set<UUID> combinedDeptIds = new HashSet<>(deptIds);
        combinedDeptIds.addAll(other.deptIds);
        return new DataScopePolicy(false, includeSelf || other.includeSelf, combinedDeptIds);
    }
}
