package com.metabuild.api.contract.permissions;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.metabuild.admin.api.security.PermissionLogic;
import com.metabuild.admin.api.security.RequiresPermissions;
import java.io.InputStream;
import java.lang.reflect.Method;
import java.util.Map;
import java.util.Set;
import io.swagger.v3.oas.models.Operation;
import org.springframework.web.method.HandlerMethod;
import org.junit.jupiter.api.Test;

class PermissionOperationExtensionTest {
    @Test
    void exportsSingleAndOrOperationsWithoutLosingLogic() throws Exception {
        assertEquals(Map.of("x-permissions", Map.of("logic", "AND", "codes", java.util.List.of("iam:user:view"))),
                extension("single"));
        assertEquals(Map.of("x-permissions", Map.of("logic", "AND", "codes", java.util.List.of("iam:user:update", "iam:user:view"))),
                extension("and"));
        assertEquals(Map.of("x-permissions", Map.of("logic", "OR", "codes", java.util.List.of("iam:role:view", "iam:user:view"))),
                extension("or"));
    }

    @Test
    void springdocCustomizerWritesMachineReadableOperationExtension() throws Exception {
        var operation = new PermissionOperationCustomizer().customize(
                new Operation(), new HandlerMethod(new Fixture(), Fixture.class.getDeclaredMethod("or")));
        assertEquals(Map.of("logic", "OR", "codes", java.util.List.of("iam:role:view", "iam:user:view")),
                operation.getExtensions().get("x-permissions"));
    }

    @Test
    void checksBackendAndMenuConsumedCodesAreCatalogSubset() throws Exception {
        var loader = new PermissionCatalogLoader(new ObjectMapper());
        var catalog = loader.load("permissions/permission-catalog.json");
        try (InputStream menu = getClass().getClassLoader().getResourceAsStream("permissions/menu-seed.json")) {
            var document = loader.parseMenu(menu);
            PermissionContractVerifier.verify(catalog, document, Set.of("iam:user:view"));
            assertThrows(IllegalArgumentException.class,
                    () -> PermissionContractVerifier.verify(catalog, document, Set.of("unknown:thing:view")));
            var wrongItems = document.items().stream().map(item -> item.sourceKey().equals("/_auth/admin/users#page")
                    ? new PermissionCatalogLoader.MenuItem(item.sourceKey(), item.subsystemKey(), item.routeKey(), item.type(),
                    item.path(), item.labelKey(), "iam:role:view", item.parentSourceKey(), item.icon(), item.sort(), item.visible()) : item).toList();
            var wrong = new PermissionCatalogLoader.MenuCatalog(document.version(), document.digest(), wrongItems);
            assertThrows(IllegalArgumentException.class,
                    () -> PermissionContractVerifier.verify(catalog, wrong, Set.of("iam:user:view")));
        }
    }

    @Test
    void parsesSingleAndOrCodesFromOpenApiSnapshot() throws Exception {
        var openApi = new ObjectMapper().readTree("""
                {"paths":{"/users":{"get":{"x-permissions":{"logic":"AND","codes":["iam:user:view"]}},
                "post":{"x-permissions":{"logic":"OR","codes":["iam:user:create","iam:user:update"]}}}}}
                """);
        assertEquals(Set.of("iam:user:view", "iam:user:create", "iam:user:update"),
                PermissionContractVerifier.consumedCodes(openApi));
    }

    private static Map<String, Object> extension(String method) throws Exception {
        Method target = Fixture.class.getDeclaredMethod(method);
        return PermissionOperationExtension.from(target).orElseThrow();
    }

    static class Fixture {
        @RequiresPermissions(codes = "iam:user:view") void single() {}
        @RequiresPermissions(codes = {"iam:user:view", "iam:user:update"}) void and() {}
        @RequiresPermissions(logic = PermissionLogic.OR, codes = {"iam:user:view", "iam:role:view"}) void or() {}
    }
}
