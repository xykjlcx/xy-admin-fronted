package com.metabuild.api.contract.permissions;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PermissionCatalogUpgradeFixtureTest {
    private static final Map<String, UUID> BOOTSTRAP_PERMISSION_IDS = Map.of(
            "/_auth/admin/dashboard#page", UUID.fromString("01900000-0000-7000-8000-000000000101"),
            "/_auth/admin/users#page", UUID.fromString("01900000-0000-7000-8000-000000000102"),
            "/_auth/admin/roles#page", UUID.fromString("01900000-0000-7000-8000-000000000103"),
            "/_auth/admin/menus#page", UUID.fromString("01900000-0000-7000-8000-000000000104"));
    private static final Map<String, UUID> BOOTSTRAP_MENU_IDS = Map.of(
            "/_auth/admin/dashboard#page", UUID.fromString("01900000-0000-7000-8000-000000000201"),
            "/_auth/admin/users#page", UUID.fromString("01900000-0000-7000-8000-000000000202"),
            "/_auth/admin/roles#page", UUID.fromString("01900000-0000-7000-8000-000000000203"),
            "/_auth/admin/menus#page", UUID.fromString("01900000-0000-7000-8000-000000000204"));

    @Test
    void v2ThenV4ThenCatalogPreservesBootstrapIdsAndGrantsAndMatchesFreshDefaults() {
        var loader = new PermissionCatalogLoader(new ObjectMapper());
        var catalog = loader.load("permissions/permission-catalog.json");
        var menu = loader.loadMenu("permissions/menu-seed.json");

        State upgraded = State.v2Bootstrap();
        upgraded.applyV4Directories();
        upgraded.reconcile(catalog, menu);
        State fresh = new State();
        fresh.reconcile(catalog, menu);

        assertEquals(BOOTSTRAP_PERMISSION_IDS, upgraded.bootstrapPermissionIds());
        assertEquals(BOOTSTRAP_MENU_IDS, upgraded.bootstrapMenuIds());
        assertEquals(new LinkedHashSet<>(BOOTSTRAP_PERMISSION_IDS.values()), upgraded.roleGrants);
        assertEquals(fresh.permissionDefaults(), upgraded.permissionDefaults());
        assertEquals(fresh.menuDefaults(), upgraded.menuDefaults());
    }

    private static final class State {
        private final Map<String, PermissionRow> permissions = new LinkedHashMap<>();
        private final Map<String, MenuRow> menus = new LinkedHashMap<>();
        private final Set<UUID> roleGrants = new LinkedHashSet<>();

        static State v2Bootstrap() {
            State state = new State();
            Map<String, String> codes = Map.of(
                    "/_auth/admin/dashboard#page", "dashboard:overview:view", "/_auth/admin/users#page", "iam:user:view",
                    "/_auth/admin/roles#page", "iam:role:view", "/_auth/admin/menus#page", "iam:menu:view");
            BOOTSTRAP_PERMISSION_IDS.forEach((source, id) -> {
                state.permissions.put(source, new PermissionRow(id, codes.get(source), "PAGE"));
                state.roleGrants.add(id);
            });
            BOOTSTRAP_MENU_IDS.forEach((source, id) -> state.menus.put(source, new MenuRow(id, source, null, null, 0)));
            return state;
        }

        void applyV4Directories() {
            menus.put("/_auth/admin#workspace", new MenuRow(UUID.fromString("01900000-0000-7000-8000-000000000211"), "nav.workspace", null, "layout-dashboard", 1));
            menus.put("/_auth/admin#organization", new MenuRow(UUID.fromString("01900000-0000-7000-8000-000000000212"), "nav.organization", null, "users", 2));
        }

        void reconcile(PermissionCatalogLoader.PermissionCatalog catalog, PermissionCatalogLoader.MenuCatalog menu) {
            catalog.items().forEach(item -> permissions.compute(item.sourceKey(), (source, existing) ->
                    new PermissionRow(existing == null ? stable("permission:" + source) : existing.id(), item.code(), item.kind().name())));
            menu.items().forEach(item -> menus.compute(item.sourceKey(), (source, existing) ->
                    new MenuRow(existing == null ? stable("menu:" + source) : existing.id(), item.labelKey(), item.parentSourceKey(), item.icon(), item.sort())));
        }

        Map<String, UUID> bootstrapPermissionIds() { return ids(permissions, BOOTSTRAP_PERMISSION_IDS.keySet()); }
        Map<String, UUID> bootstrapMenuIds() { return ids(menus, BOOTSTRAP_MENU_IDS.keySet()); }
        Map<String, String> permissionDefaults() {
            var result = new LinkedHashMap<String, String>(); permissions.forEach((key, value) -> result.put(key, value.code() + '|' + value.kind())); return result;
        }
        Map<String, String> menuDefaults() {
            var result = new LinkedHashMap<String, String>(); menus.forEach((key, value) -> result.put(key, value.label() + '|' + value.parent() + '|' + value.icon() + '|' + value.sort())); return result;
        }
        private static <T> Map<String, UUID> ids(Map<String, T> rows, Set<String> keys) {
            var result = new LinkedHashMap<String, UUID>(); keys.forEach(key -> result.put(key, rows.get(key) instanceof PermissionRow p ? p.id() : ((MenuRow) rows.get(key)).id())); return result;
        }
        private static UUID stable(String value) { return UUID.nameUUIDFromBytes(value.getBytes(StandardCharsets.UTF_8)); }
    }

    private record PermissionRow(UUID id, String code, String kind) {}
    private record MenuRow(UUID id, String label, String parent, String icon, int sort) {}
}
