package com.metabuild.modules.admin.auth.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AuthorizationSnapshotCompilerTest {

    private static final UUID USER = UUID.fromString("01900000-0000-7000-8000-000000000001");
    private static final UUID OWN = UUID.fromString("01900000-0000-7000-8000-000000000002");
    private static final UUID CHILD = UUID.fromString("01900000-0000-7000-8000-000000000003");
    private static final UUID CUSTOM = UUID.fromString("01900000-0000-7000-8000-000000000004");

    @Test
    void mergesSelfAndCustomScopeWithRolesAndPermissions() {
        var compiler = new AuthorizationSnapshotCompiler();
        var graph = new AuthorizationGraph(USER, 7, OWN, List.of(
                new AuthorizationGrant("self", false, ScopeType.SELF, Set.of(), Set.of("iam:user:view")),
                new AuthorizationGrant("custom", false, ScopeType.CUSTOM_DEPT, Set.of(CUSTOM), Set.of("iam:role:view"))));

        var snapshot = compiler.compile(graph, Instant.EPOCH);

        assertThat(snapshot.revision()).isEqualTo(7);
        assertThat(snapshot.roles()).containsExactlyInAnyOrder("self", "custom");
        assertThat(snapshot.permissions()).containsExactlyInAnyOrder("iam:user:view", "iam:role:view");
        assertThat(snapshot.dataScope().includeSelf()).isTrue();
        assertThat(snapshot.dataScope().deptIds()).containsExactly(CUSTOM);
    }

    @Test
    void mergesOwnChildrenAndCustomScope() {
        var compiler = new AuthorizationSnapshotCompiler();
        var graph = new AuthorizationGraph(USER, 8, OWN, List.of(
                new AuthorizationGrant("tree", false, ScopeType.OWN_DEPT_AND_BELOW, Set.of(OWN, CHILD), Set.of()),
                new AuthorizationGrant("custom", false, ScopeType.CUSTOM_DEPT, Set.of(CUSTOM), Set.of())));

        var snapshot = compiler.compile(graph, Instant.EPOCH);

        assertThat(snapshot.dataScope().includeSelf()).isFalse();
        assertThat(snapshot.dataScope().deptIds()).containsExactlyInAnyOrder(OWN, CHILD, CUSTOM);
    }

    @Test
    void systemAdminShortCircuitsToAllAndNoRolesDeniesAll() {
        var compiler = new AuthorizationSnapshotCompiler();
        var admin = compiler.compile(new AuthorizationGraph(USER, 1, OWN, List.of(
                new AuthorizationGrant("system", true, ScopeType.ALL, Set.of(), Set.of("iam:user:view")))), Instant.EPOCH);
        var none = compiler.compile(new AuthorizationGraph(USER, 2, OWN, List.of()), Instant.EPOCH);

        assertThat(admin.systemAdmin()).isTrue();
        assertThat(admin.dataScope().all()).isTrue();
        assertThat(none.dataScope().all()).isFalse();
        assertThat(none.dataScope().includeSelf()).isFalse();
        assertThat(none.dataScope().deptIds()).isEmpty();
    }
}
