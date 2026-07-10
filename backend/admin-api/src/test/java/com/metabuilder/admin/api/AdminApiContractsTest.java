package com.metabuilder.admin.api;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AdminApiContractsTest {

    @Test
    void exposesOnlyStableSummaryFields() {
        assertRecord(
                UserSummary.class,
                List.of("id", "displayName", "deptId", "active"),
                List.of(UUID.class, String.class, UUID.class, boolean.class));
        assertRecord(
                DepartmentSummary.class,
                List.of("id", "parentId", "name", "active"),
                List.of(UUID.class, UUID.class, String.class, boolean.class));
        assertRecord(
                FileMetadata.class,
                List.of("id", "name", "contentType", "size", "sha256"),
                List.of(UUID.class, String.class, String.class, long.class, String.class));
    }

    @Test
    void exposesUploadPolicyAndInboxContracts() {
        assertRecord(
                UploadPolicy.class,
                List.of("extensions", "mimeTypes", "maxBytes", "ttl"),
                List.of(Set.class, Set.class, long.class, Duration.class));
        assertRecord(
                InboxMessageCommand.class,
                List.of(
                        "idempotencyKey",
                        "recipientUserId",
                        "category",
                        "titleKey",
                        "body",
                        "link"),
                List.of(
                        String.class,
                        UUID.class,
                        String.class,
                        String.class,
                        String.class,
                        String.class));
        assertRecord(
                PublishResult.class,
                List.of("acceptedKeys", "rejectedKeys"),
                List.of(Set.class, Set.class));
    }

    @Test
    void capabilityTicketsExposeOnlyTokenAndExpiry() {
        assertRecord(
                UploadTicket.class,
                List.of("token", "expiresAt"),
                List.of(String.class, Instant.class));
        assertRecord(
                DownloadTicket.class,
                List.of("token", "expiresAt"),
                List.of(String.class, Instant.class));
    }

    @Test
    void exposesFiveNarrowPortsWithBindingInputs() throws NoSuchMethodException {
        assertMethods(UserDirectoryApi.class, "batchGetUsers");
        assertMethod(
                UserDirectoryApi.class, "batchGetUsers", BatchResult.class, Set.class);

        assertMethods(DepartmentDirectoryApi.class, "batchGetDepartments", "expandSubtree");
        assertMethod(
                DepartmentDirectoryApi.class,
                "batchGetDepartments",
                BatchResult.class,
                Set.class);
        assertMethod(
                DepartmentDirectoryApi.class, "expandSubtree", Set.class, Set.class);

        assertMethods(AttachmentApi.class, "issueUploadTicket");
        assertMethod(
                AttachmentApi.class,
                "issueUploadTicket",
                UploadTicket.class,
                UploadPolicy.class,
                UUID.class,
                String.class);

        assertMethods(FileCatalogApi.class, "batchGetMetadata", "issueDownloadTicket");
        assertMethod(
                FileCatalogApi.class, "batchGetMetadata", BatchResult.class, Set.class);
        assertMethod(
                FileCatalogApi.class,
                "issueDownloadTicket",
                DownloadTicket.class,
                UUID.class,
                UUID.class,
                String.class);

        assertMethods(InboxPublisher.class, "publish");
        assertMethod(
                InboxPublisher.class, "publish", PublishResult.class, Collection.class);
    }

    @Test
    void preservesGenericTypesOnDirectoryAndPublishingPorts() {
        assertGenericMethod(
                UserDirectoryApi.class,
                "batchGetUsers",
                "com.metabuilder.admin.api.BatchResult<java.util.UUID, com.metabuilder.admin.api.UserSummary>",
                "java.util.Set<java.util.UUID>");
        assertGenericMethod(
                DepartmentDirectoryApi.class,
                "batchGetDepartments",
                "com.metabuilder.admin.api.BatchResult<java.util.UUID, com.metabuilder.admin.api.DepartmentSummary>",
                "java.util.Set<java.util.UUID>");
        assertGenericMethod(
                DepartmentDirectoryApi.class,
                "expandSubtree",
                "java.util.Set<java.util.UUID>",
                "java.util.Set<java.util.UUID>");
        assertGenericMethod(
                FileCatalogApi.class,
                "batchGetMetadata",
                "com.metabuilder.admin.api.BatchResult<java.util.UUID, com.metabuilder.admin.api.FileMetadata>",
                "java.util.Set<java.util.UUID>");
        assertGenericMethod(
                InboxPublisher.class,
                "publish",
                "com.metabuilder.admin.api.PublishResult",
                "java.util.Collection<com.metabuilder.admin.api.InboxMessageCommand>");
    }

    @Test
    void doesNotPrematurelyExposeAuthOrGodApiTypes() {
        assertThrows(
                ClassNotFoundException.class,
                () -> Class.forName("com.metabuilder.shared.kernel.CurrentUser"));
        assertThrows(
                ClassNotFoundException.class,
                () -> Class.forName("com.metabuilder.shared.kernel.AuthFacade"));
        assertThrows(
                ClassNotFoundException.class,
                () -> Class.forName("com.metabuilder.admin.api.AdminApi"));
    }

    private static void assertRecord(
            Class<?> type, List<String> componentNames, List<Class<?>> componentTypes) {
        assertTrue(type.isRecord());
        assertEquals(componentNames, List.of(type.getRecordComponents()).stream()
                .map(component -> component.getName())
                .toList());
        assertEquals(componentTypes, List.of(type.getRecordComponents()).stream()
                .map(component -> component.getType())
                .toList());
    }

    private static void assertMethods(Class<?> type, String... names) {
        assertTrue(type.isInterface());
        assertEquals(names.length, type.getDeclaredMethods().length);
        assertEquals(
                Set.of(names),
                List.of(type.getDeclaredMethods()).stream().map(Method::getName).collect(java.util.stream.Collectors.toSet()));
    }

    private static void assertMethod(
            Class<?> type, String name, Class<?> returnType, Class<?>... parameterTypes)
            throws NoSuchMethodException {
        Method method = type.getDeclaredMethod(name, parameterTypes);
        assertEquals(returnType, method.getReturnType());
        assertArrayEquals(parameterTypes, method.getParameterTypes());
        assertTrue(Modifier.isPublic(method.getModifiers()));
        assertTrue(Modifier.isAbstract(method.getModifiers()));
    }

    private static void assertGenericMethod(
            Class<?> type, String name, String returnType, String parameterType) {
        Method method = List.of(type.getDeclaredMethods()).stream()
                .filter(candidate -> name.equals(candidate.getName()))
                .findFirst()
                .orElseThrow();
        assertEquals(returnType, method.getGenericReturnType().getTypeName());
        assertEquals(parameterType, method.getGenericParameterTypes()[0].getTypeName());
    }
}
