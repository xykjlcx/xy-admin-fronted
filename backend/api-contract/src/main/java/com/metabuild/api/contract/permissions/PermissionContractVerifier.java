package com.metabuild.api.contract.permissions;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.LinkedHashSet;
import java.util.Set;
import com.metabuild.api.contract.permissions.PermissionCatalogLoader.MenuCatalog;
import com.metabuild.api.contract.permissions.PermissionCatalogLoader.PermissionCatalog;

public final class PermissionContractVerifier {
    private PermissionContractVerifier() {}

    public static void verify(PermissionCatalog catalog, MenuCatalog menuSeed, Set<String> backendConsumedCodes) {
        Set<String> missingBackend = difference(backendConsumedCodes, catalog.codes());
        if (!missingBackend.isEmpty()) throw new IllegalArgumentException("Backend permissions absent from catalog: " + missingBackend);
        Set<String> menuCodes = new LinkedHashSet<>();
        menuSeed.items().forEach(item -> { if (item.permission() != null) menuCodes.add(item.permission()); });
        Set<String> missingMenu = difference(menuCodes, catalog.codes());
        if (!missingMenu.isEmpty()) throw new IllegalArgumentException("Menu permissions absent from catalog: " + missingMenu);
        menuSeed.items().forEach(item -> {
            if (item.permission() != null && !item.permission().equals(catalog.codeBySource().get(item.sourceKey()))) {
                throw new IllegalArgumentException("Menu sourceKey/code pair differs from catalog: " + item.sourceKey());
            }
        });
    }

    public static Set<String> consumedCodes(JsonNode openApi) {
        Set<String> result = new LinkedHashSet<>();
        JsonNode paths = openApi.path("paths");
        paths.properties().forEach(path -> path.getValue().properties().forEach(operation -> {
            JsonNode extension = operation.getValue().get("x-permissions");
            if (extension == null) return;
            String logic = extension.path("logic").asText();
            if (!logic.equals("AND") && !logic.equals("OR")) {
                throw new IllegalArgumentException("Invalid x-permissions logic: " + logic);
            }
            JsonNode codes = extension.path("codes");
            if (!codes.isArray() || codes.isEmpty()) throw new IllegalArgumentException("x-permissions codes must not be empty");
            codes.forEach(code -> result.add(code.asText()));
        }));
        return Set.copyOf(result);
    }

    private static Set<String> difference(Set<String> values, Set<String> allowed) {
        Set<String> result = new LinkedHashSet<>(values);
        result.removeAll(allowed);
        return result;
    }
}
