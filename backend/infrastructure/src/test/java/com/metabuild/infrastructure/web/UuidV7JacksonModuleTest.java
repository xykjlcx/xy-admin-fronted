package com.metabuild.infrastructure.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.metabuild.admin.api.BatchResult;
import com.metabuild.admin.api.UserSummary;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.support.StaticMessageSource;

class UuidV7JacksonModuleTest {

    private static final UUID UUID_V7 =
            UUID.fromString("018bcfe5-687b-7123-8000-000000000456");
    private static final UUID UUID_V4 =
            UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

    private final ObjectMapper objectMapper =
            new ObjectMapper().registerModule(new UuidV7JacksonModule());

    @Test
    void roundTripsCanonicalUuidV7Strings() throws Exception {
        String json = objectMapper.writeValueAsString(UUID_V7);

        assertEquals("\"018bcfe5-687b-7123-8000-000000000456\"", json);
        assertEquals(UUID_V7, objectMapper.readValue(json, UUID.class));
    }

    @Test
    void serializationRejectsNonV7UuidValues() {
        JsonProcessingException failure = assertThrows(
                JsonProcessingException.class,
                () -> objectMapper.writeValueAsString(UUID_V4));

        assertTrue(failure.getMessage().contains("UUIDv7"));
    }

    @Test
    void deserializationRejectsNonV7UuidValues() {
        JsonProcessingException failure = assertThrows(
                JsonProcessingException.class,
                () -> objectMapper.readValue("\"550e8400-e29b-41d4-a716-446655440000\"", UUID.class));

        assertTrue(failure.getMessage().contains("UUIDv7"));
    }

    @Test
    void deserializationRejectsNonCanonicalUuidStrings() {
        JsonProcessingException failure = assertThrows(
                JsonProcessingException.class,
                () -> objectMapper.readValue(
                        "\"018BCFE5-687B-7123-8000-000000000456\"", UUID.class));

        assertTrue(failure.getMessage().contains("canonical"));
    }

    @Test
    void deserializationRejectsNonStringTokens() {
        assertThrows(
                JsonProcessingException.class,
                () -> objectMapper.readValue("123", UUID.class));
    }

    @Test
    void roundTripsCanonicalUuidV7MapKeys() throws Exception {
        String json = objectMapper.writeValueAsString(Map.of(UUID_V7, "value"));

        assertEquals("{\"018bcfe5-687b-7123-8000-000000000456\":\"value\"}", json);
        assertEquals(
                Map.of(UUID_V7, "value"),
                objectMapper.readValue(json, new TypeReference<Map<UUID, String>>() {}));
    }

    @Test
    void serializationRejectsNonV7UuidMapKeys() {
        JsonProcessingException failure = assertThrows(
                JsonProcessingException.class,
                () -> objectMapper.writeValueAsString(Map.of(UUID_V4, "value")));

        assertTrue(failure.getMessage().contains("UUIDv7"));
    }

    @Test
    void deserializationRejectsNonV7UuidMapKeys() {
        JsonProcessingException failure = assertThrows(
                JsonProcessingException.class,
                () -> objectMapper.readValue(
                        "{\"550e8400-e29b-41d4-a716-446655440000\":\"value\"}",
                        new TypeReference<Map<UUID, String>>() {}));

        assertTrue(failure.getMessage().contains("UUIDv7"));
    }

    @Test
    void roundTripsTheRealUuidKeyedBatchResultContract() throws Exception {
        UUID deptId = UUID.fromString("018bcfe5-687c-7123-8000-000000000456");
        BatchResult<UUID, UserSummary> expected = new BatchResult<>(
                Map.of(UUID_V7, new UserSummary(UUID_V7, "operator", deptId, true)),
                java.util.Set.of());

        String json = objectMapper.writeValueAsString(expected);
        BatchResult<UUID, UserSummary> actual = objectMapper.readValue(
                json, new TypeReference<BatchResult<UUID, UserSummary>>() {});

        assertEquals(expected, actual);
    }

    @Test
    void webAutoConfigurationRegistersTheUuidV7ModuleWithTheSpringObjectMapper() throws Exception {
        try (var context = new AnnotationConfigApplicationContext()) {
            context.registerBean("messageSource", MessageSource.class, StaticMessageSource::new);
            context.register(JacksonAutoConfiguration.class, InfrastructureWebAutoConfiguration.class);
            context.refresh();

            assertTrue(context.containsBean("uuidV7JacksonModule"));
            ObjectMapper springMapper = context.getBean(ObjectMapper.class);
            assertEquals(UUID_V7, springMapper.readValue(
                    "\"018bcfe5-687b-7123-8000-000000000456\"", UUID.class));
            assertThrows(
                    JsonProcessingException.class,
                    () -> springMapper.readValue(
                            "\"550e8400-e29b-41d4-a716-446655440000\"", UUID.class));
        }
    }
}
