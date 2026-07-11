package com.metabuild.api.contract.permissions;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;

class PermissionCatalogContractTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final PermissionCatalogLoader loader = new PermissionCatalogLoader(mapper);

    @Test
    void loadsGeneratedCatalogFromClasspathAndRejectsDigestTampering() throws Exception {
        var catalog = loader.load("permissions/permission-catalog.json");
        assertEquals(1, catalog.version());
        String original;
        try (var input = getClass().getClassLoader().getResourceAsStream("permissions/permission-catalog.json")) {
            original = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
        String tampered = original.replace("iam:user:view", "iam:user:read");
        assertThrows(IllegalArgumentException.class,
                () -> loader.parse(new ByteArrayInputStream(tampered.getBytes(StandardCharsets.UTF_8))));
    }

    @Test
    void strictlyRejectsPermissionSchemaAndSemanticViolations() throws Exception {
        assertInvalidPermission(root -> root.put("unknown", true));
        assertInvalidPermission(root -> root.put("version", 2));
        assertInvalidPermission(root -> ((ObjectNode) root.withArray("items").get(0)).put("kind", "UNKNOWN"));
        assertInvalidPermission(root -> ((ObjectNode) root.withArray("items").get(0)).put("routeId", "dynamic"));
        assertInvalidPermission(root -> ((ObjectNode) root.withArray("items").get(0)).put("sourceKey", "/wrong#page"));
        assertInvalidPermission(root -> ((ObjectNode) root.withArray("items").get(0)).put("code", "legacy:view"));
        assertInvalidPermission(root -> root.withArray("items").add(root.withArray("items").get(0).deepCopy()));
    }

    @Test
    void strictlyLoadsMenuAndRejectsParentNavigationTypeAndUnknownFields() throws Exception {
        var menu = loader.loadMenu("permissions/menu-seed.json");
        assertEquals(18, menu.items().size());
        assertInvalidMenu(root -> ((ObjectNode) root.withArray("items").get(0)).put("unknown", true));
        assertInvalidMenu(root -> ((ObjectNode) root.withArray("items").get(0)).put("type", "unknown"));
        assertInvalidMenu(root -> ((ObjectNode) root.withArray("items").get(0)).put("parentSourceKey", "/missing#dir"));
        assertInvalidMenu(root -> ((ObjectNode) root.withArray("items").get(0)).put("path", "/must-not-navigate"));
        assertInvalidMenu(root -> ((ObjectNode) root.withArray("items").get(2)).putNull("path"));
        assertInvalidMenu(root -> root.withArray("items").add(root.withArray("items").get(0).deepCopy()));
    }

    private void assertInvalidPermission(Consumer<ObjectNode> mutation) throws Exception {
        ObjectNode root = resource("permissions/permission-catalog.json");
        mutation.accept(root);
        assertThrows(IllegalArgumentException.class, () -> loader.parse(stream(rehash(root))));
    }

    private void assertInvalidMenu(Consumer<ObjectNode> mutation) throws Exception {
        ObjectNode root = resource("permissions/menu-seed.json");
        mutation.accept(root);
        assertThrows(IllegalArgumentException.class, () -> loader.parseMenu(stream(rehash(root))));
    }

    private ObjectNode resource(String name) throws Exception {
        try (var input = getClass().getClassLoader().getResourceAsStream(name)) {
            return (ObjectNode) mapper.readTree(input);
        }
    }

    private byte[] rehash(ObjectNode root) throws Exception {
        ObjectNode body = mapper.createObjectNode();
        body.set("version", root.get("version"));
        body.set("items", root.get("items"));
        root.put("digest", HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(body))));
        return mapper.writeValueAsBytes(root);
    }

    private static ByteArrayInputStream stream(byte[] bytes) { return new ByteArrayInputStream(bytes); }
}
