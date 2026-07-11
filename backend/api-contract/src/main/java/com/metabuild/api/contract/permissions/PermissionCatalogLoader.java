package com.metabuild.api.contract.permissions;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

public final class PermissionCatalogLoader {
    private static final Pattern CODE = Pattern.compile("^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$");
    private static final Pattern SOURCE = Pattern.compile("^/.+#(page|action:[a-z][a-z0-9-]*)$");
    private static final Pattern MENU_SOURCE = Pattern.compile("^/.+#(page|[a-z][a-z0-9-]*)$");
    private static final Pattern DIGEST = Pattern.compile("^[0-9a-f]{64}$");
    private final ObjectMapper mapper;

    public PermissionCatalogLoader(ObjectMapper mapper) {
        this.mapper = mapper.copy().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .setSerializationInclusion(JsonInclude.Include.NON_NULL);
    }

    public PermissionCatalog load(String resource) { return withResource(resource, this::parse); }
    public MenuCatalog loadMenu(String resource) { return withResource(resource, this::parseMenu); }

    public PermissionCatalog parse(InputStream input) {
        byte[] bytes = bytes(input);
        verifyRawDigest(bytes);
        PermissionDocument document = read(new ByteArrayInputStream(bytes), PermissionDocument.class);
        verifyEnvelope(document.version(), document.items(), document.digest());
        Set<String> codes = new HashSet<>();
        Set<String> sources = new HashSet<>();
        Map<String, String> codeBySource = new java.util.LinkedHashMap<>();
        for (PermissionItem item : document.items()) {
            require(item.routeId() != null && item.routeId().startsWith("/"), "Invalid routeId");
            require(item.sourceKey() != null && SOURCE.matcher(item.sourceKey()).matches(), "Invalid permission sourceKey");
            require(item.code() != null && CODE.matcher(item.code()).matches(), "Invalid permission code");
            require(item.kind() != null, "Missing permission kind");
            String expected = item.kind() == PermissionKind.PAGE ? item.routeId() + "#page" : item.routeId() + "#action:";
            require(item.kind() == PermissionKind.PAGE ? item.sourceKey().equals(expected) : item.sourceKey().startsWith(expected), "sourceKey/routeId/kind mismatch");
            require(codes.add(item.code()), "Duplicate permission code");
            require(sources.add(item.sourceKey()), "Duplicate permission sourceKey");
            codeBySource.put(item.sourceKey(), item.code());
        }
        return new PermissionCatalog(document.version(), document.digest(), Set.copyOf(codes), Map.copyOf(codeBySource), List.copyOf(document.items()));
    }

    public MenuCatalog parseMenu(InputStream input) {
        byte[] bytes = bytes(input);
        verifyRawDigest(bytes);
        requireMenuFields(bytes);
        MenuDocument document = read(new ByteArrayInputStream(bytes), MenuDocument.class);
        verifyEnvelope(document.version(), document.items(), document.digest());
        Set<String> sources = new HashSet<>();
        for (MenuItem item : document.items()) {
            require(item.sourceKey() != null && MENU_SOURCE.matcher(item.sourceKey()).matches(), "Invalid menu sourceKey");
            require(item.subsystemKey() != null && !item.subsystemKey().isBlank(), "Missing subsystemKey");
            require(item.labelKey() != null && !item.labelKey().isBlank(), "Missing labelKey");
            require(item.icon() != null && !item.icon().isBlank(), "Missing icon");
            require(item.sort() >= 0, "Invalid sort");
            require(item.type() != null, "Missing menu type");
            require(sources.add(item.sourceKey()), "Duplicate menu sourceKey");
            if (item.type() == MenuType.menu) {
                require(item.routeKey() != null && item.routeKey().startsWith("/_auth/") && item.path() != null && item.path().startsWith("/") && item.permission() != null, "Navigable menu fields required");
                require(item.sourceKey().equals(item.routeKey() + "#page"), "Menu sourceKey/routeKey mismatch");
                require(CODE.matcher(item.permission()).matches(), "Invalid menu permission");
            } else {
                require(item.routeKey() == null && item.path() == null && item.permission() == null, "Directory must be display-only");
            }
        }
        for (MenuItem item : document.items()) {
            require(item.parentSourceKey() == null || sources.contains(item.parentSourceKey()), "Unknown menu parent");
        }
        return new MenuCatalog(document.version(), document.digest(), List.copyOf(document.items()));
    }

    private <T> T withResource(String resource, Parser<T> parser) {
        try (InputStream input = PermissionCatalogLoader.class.getClassLoader().getResourceAsStream(resource)) {
            if (input == null) throw new IllegalArgumentException("Missing classpath resource: " + resource);
            return parser.parse(input);
        } catch (IOException exception) { throw new IllegalArgumentException("Cannot read artifact", exception); }
    }

    private <T> T read(InputStream input, Class<T> type) {
        try { return mapper.readValue(input, type); }
        catch (IOException exception) { throw new IllegalArgumentException("Invalid permission artifact schema", exception); }
    }

    private static byte[] bytes(InputStream input) {
        try { return input.readAllBytes(); }
        catch (IOException exception) { throw new IllegalArgumentException("Cannot read permission artifact", exception); }
    }

    private void verifyRawDigest(byte[] bytes) {
        try {
            var root = mapper.readTree(bytes);
            require(root.isObject() && root.has("version") && root.has("items") && root.has("digest"), "Invalid artifact envelope");
            String digest = root.path("digest").asText();
            var body = mapper.createObjectNode();
            body.set("version", root.get("version"));
            body.set("items", root.get("items"));
            String actual = java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(body)));
            require(MessageDigest.isEqual(digest.getBytes(StandardCharsets.US_ASCII), actual.getBytes(StandardCharsets.US_ASCII)), "Permission artifact digest mismatch");
        } catch (IOException | NoSuchAlgorithmException exception) { throw new IllegalArgumentException("Invalid permission artifact", exception); }
    }

    private void requireMenuFields(byte[] bytes) {
        try {
            var root = mapper.readTree(bytes);
            Set<String> required = Set.of("sourceKey", "subsystemKey", "routeKey", "type", "path", "labelKey",
                    "permission", "parentSourceKey", "icon", "sort", "visible");
            for (var item : root.path("items")) require(item.properties().stream().map(Map.Entry::getKey).collect(java.util.stream.Collectors.toSet()).equals(required), "Menu fields must be complete and exact");
        } catch (IOException exception) { throw new IllegalArgumentException("Invalid menu artifact", exception); }
    }

    private void verifyEnvelope(int version, Object items, String digest) {
        require(version == 1, "Unsupported artifact version");
        require(items != null, "Missing items");
        require(digest != null && DIGEST.matcher(digest).matches(), "Invalid digest");
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalArgumentException(message);
    }

    @FunctionalInterface private interface Parser<T> { T parse(InputStream input); }
    private record PermissionDocument(int version, List<PermissionItem> items, String digest) {}
    private record MenuDocument(int version, List<MenuItem> items, String digest) {}
    public enum PermissionKind { PAGE, ACTION }
    public enum MenuType { menu, dir }
    public record PermissionItem(String sourceKey, String code, PermissionKind kind, String routeId, String labelKey) {}
    public record MenuItem(String sourceKey, String subsystemKey, String routeKey, MenuType type, String path,
                           String labelKey, String permission, String parentSourceKey, String icon, int sort, boolean visible) {}
    public record PermissionCatalog(int version, String digest, Set<String> codes, Map<String, String> codeBySource, List<PermissionItem> items) {}
    public record MenuCatalog(int version, String digest, List<MenuItem> items) {}
}
