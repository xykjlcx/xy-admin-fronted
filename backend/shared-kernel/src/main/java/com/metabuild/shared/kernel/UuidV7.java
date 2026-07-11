package com.metabuild.shared.kernel;

import java.util.UUID;

/**
 * RFC 9562 UUIDv7 校验与解析工具。
 */
public final class UuidV7 {

    private static final int VERSION = 7;
    private static final int RFC_4122_VARIANT = 2;

    private UuidV7() {}

    public static boolean isValid(UUID value) {
        return value != null
                && value.version() == VERSION
                && value.variant() == RFC_4122_VARIANT;
    }

    public static UUID require(UUID value) {
        if (!isValid(value)) {
            throw new IllegalArgumentException("Expected an RFC 9562 UUIDv7 value");
        }
        return value;
    }

    public static UUID parse(String value) {
        if (value == null) {
            throw new IllegalArgumentException("UUIDv7 string must not be null");
        }

        final UUID parsed;
        try {
            parsed = UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Invalid UUIDv7 string", exception);
        }

        if (!parsed.toString().equals(value)) {
            throw new IllegalArgumentException("UUIDv7 string must use lowercase canonical form");
        }
        return require(parsed);
    }

    public static long unixEpochMillis(UUID value) {
        UUID uuid = require(value);
        return uuid.getMostSignificantBits() >>> 16;
    }
}
