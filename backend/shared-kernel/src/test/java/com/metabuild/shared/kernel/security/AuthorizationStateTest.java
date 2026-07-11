package com.metabuild.shared.kernel.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AuthorizationStateTest {

    private static final UUID USER_ID = UUID.fromString("018bcfe5-687b-7123-8000-000000000456");
    private static final UUID OPERATION_ID =
            UUID.fromString("018bcfe5-687c-7123-8000-000000000456");
    private static final Instant NOW = Instant.parse("2023-11-14T22:13:20.123Z");

    @Test
    void authorizationRecordsKeepTheExactV4Contract() {
        assertEquals(
                List.of("userId", "revision", "systemAdmin", "roles", "permissions", "dataScope", "calculatedAt"),
                componentNames(AuthorizationSnapshot.class));
        assertEquals(
                List.of(UUID.class, long.class, boolean.class, Set.class, Set.class, DataScopePolicy.class, Instant.class),
                componentTypes(AuthorizationSnapshot.class));
        assertEquals(
                List.of("userId", "targetRevision", "operationId", "fencedAt"),
                componentNames(AuthorizationFence.class));
        assertEquals(
                List.of(UUID.class, long.class, UUID.class, Instant.class),
                componentTypes(AuthorizationFence.class));
        assertTrue(AuthorizationState.class.isSealed());
        assertEquals(
                Set.of(AuthorizationSnapshot.class, AuthorizationFence.class),
                Set.of(AuthorizationState.class.getPermittedSubclasses()));
    }

    @Test
    void snapshotDefensivelyCopiesRolesAndPermissions() {
        Set<String> roles = new HashSet<>(Set.of("admin"));
        Set<String> permissions = new HashSet<>(Set.of("iam:user:view"));
        AuthorizationSnapshot snapshot = new AuthorizationSnapshot(
                USER_ID,
                0,
                false,
                roles,
                permissions,
                DataScopePolicy.denyAll(),
                NOW);

        roles.add("operator");
        permissions.add("iam:user:edit");

        assertEquals(Set.of("admin"), snapshot.roles());
        assertEquals(Set.of("iam:user:view"), snapshot.permissions());
        assertThrows(UnsupportedOperationException.class, () -> snapshot.roles().add("auditor"));
        assertThrows(
                UnsupportedOperationException.class,
                () -> snapshot.permissions().add("iam:user:delete"));
    }

    @Test
    void authorizationRecordsRejectNegativeRevisions() {
        assertThrows(
                IllegalArgumentException.class,
                () -> new AuthorizationSnapshot(
                        USER_ID,
                        -1,
                        false,
                        Set.of(),
                        Set.of(),
                        DataScopePolicy.denyAll(),
                        NOW));
        assertThrows(
                IllegalArgumentException.class,
                () -> new AuthorizationFence(USER_ID, -1, OPERATION_ID, NOW));
    }

    @Test
    void allPolicyNormalizesAwayNarrowerConditions() {
        UUID deptId = UUID.fromString("018bcfe5-687d-7123-8000-000000000456");

        DataScopePolicy policy = new DataScopePolicy(true, true, Set.of(deptId));

        assertTrue(policy.all());
        assertFalse(policy.includeSelf());
        assertEquals(Set.of(), policy.deptIds());
    }

    @Test
    void denyAllHasNoEnabledCondition() {
        DataScopePolicy policy = DataScopePolicy.denyAll();

        assertFalse(policy.all());
        assertFalse(policy.includeSelf());
        assertEquals(Set.of(), policy.deptIds());
    }

    @Test
    void policyDefensivelyCopiesDepartmentIds() {
        UUID deptId = UUID.fromString("018bcfe5-687d-7123-8000-000000000456");
        Set<UUID> source = new HashSet<>(Set.of(deptId));

        DataScopePolicy policy = new DataScopePolicy(false, false, source);
        source.clear();

        assertEquals(Set.of(deptId), policy.deptIds());
        assertThrows(UnsupportedOperationException.class, () -> policy.deptIds().clear());
    }

    @Test
    void unionCombinesSelfDepartmentAndCustomScopes() {
        UUID ownDept = UUID.fromString("018bcfe5-687d-7123-8000-000000000456");
        UUID customDept = UUID.fromString("018bcfe5-687e-7123-8000-000000000456");
        DataScopePolicy self = new DataScopePolicy(false, true, Set.of());
        DataScopePolicy ownDepartment = new DataScopePolicy(false, false, Set.of(ownDept));
        DataScopePolicy customDepartment = new DataScopePolicy(false, false, Set.of(customDept));

        DataScopePolicy combined = self.union(ownDepartment).union(customDepartment);

        assertFalse(combined.all());
        assertTrue(combined.includeSelf());
        assertEquals(Set.of(ownDept, customDept), combined.deptIds());
    }

    @Test
    void unionShortCircuitsAllAndTreatsDenyAllAsIdentity() {
        DataScopePolicy department = new DataScopePolicy(
                false,
                false,
                Set.of(UUID.fromString("018bcfe5-687d-7123-8000-000000000456")));

        assertEquals(DataScopePolicy.allAccess(), department.union(DataScopePolicy.allAccess()));
        assertEquals(DataScopePolicy.allAccess(), DataScopePolicy.allAccess().union(department));
        assertEquals(department, department.union(DataScopePolicy.denyAll()));
        assertEquals(department, DataScopePolicy.denyAll().union(department));
    }

    private static List<String> componentNames(Class<?> type) {
        return List.of(type.getRecordComponents()).stream().map(component -> component.getName()).toList();
    }

    private static List<Class<?>> componentTypes(Class<?> type) {
        return List.of(type.getRecordComponents()).stream()
                .<Class<?>>map(component -> component.getType())
                .toList();
    }
}
