package com.metabuild.infrastructure.web;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.KeyDeserializer;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.metabuild.shared.kernel.UuidV7;
import java.io.IOException;
import java.util.UUID;

/**
 * 将 Java UUID 的 wire contract 收紧为 canonical UUIDv7 string。
 */
public final class UuidV7JacksonModule extends SimpleModule {

    public UuidV7JacksonModule() {
        super("metabuilder-uuid-v7");
        addSerializer(UUID.class, new UuidV7Serializer());
        addDeserializer(UUID.class, new UuidV7Deserializer());
        addKeySerializer(UUID.class, new UuidV7KeySerializer());
        addKeyDeserializer(UUID.class, new UuidV7KeyDeserializer());
    }

    private static final class UuidV7Serializer extends JsonSerializer<UUID> {

        @Override
        public void serialize(UUID value, JsonGenerator generator, SerializerProvider serializers)
                throws IOException {
            if (!UuidV7.isValid(value)) {
                throw JsonMappingException.from(generator, "Expected an RFC 9562 UUIDv7 value");
            }
            generator.writeString(value.toString());
        }
    }

    private static final class UuidV7Deserializer extends JsonDeserializer<UUID> {

        @Override
        public UUID deserialize(JsonParser parser, DeserializationContext context)
                throws IOException {
            if (!parser.hasToken(JsonToken.VALUE_STRING)) {
                return (UUID) context.handleUnexpectedToken(UUID.class, parser);
            }

            String value = parser.getText();
            try {
                return UuidV7.parse(value);
            } catch (IllegalArgumentException exception) {
                throw context.weirdStringException(value, UUID.class, exception.getMessage());
            }
        }
    }

    private static final class UuidV7KeySerializer extends JsonSerializer<UUID> {

        @Override
        public void serialize(UUID value, JsonGenerator generator, SerializerProvider serializers)
                throws IOException {
            if (!UuidV7.isValid(value)) {
                throw JsonMappingException.from(generator, "Expected an RFC 9562 UUIDv7 map key");
            }
            generator.writeFieldName(value.toString());
        }
    }

    private static final class UuidV7KeyDeserializer extends KeyDeserializer {

        @Override
        public UUID deserializeKey(String key, DeserializationContext context) throws IOException {
            try {
                return UuidV7.parse(key);
            } catch (IllegalArgumentException exception) {
                throw context.weirdKeyException(UUID.class, key, exception.getMessage());
            }
        }
    }
}
