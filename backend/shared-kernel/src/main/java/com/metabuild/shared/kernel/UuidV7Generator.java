package com.metabuild.shared.kernel;

import java.security.SecureRandom;
import java.time.Clock;
import java.util.Objects;
import java.util.UUID;
import java.util.random.RandomGenerator;

/**
 * 单进程单调的 RFC 9562 UUIDv7 生成器。
 */
public final class UuidV7Generator {

    private static final long MAX_TIMESTAMP = 0x0000ffffffffffffL;
    private static final int MAX_RANDOM_A = 0x0fff;
    private static final long MAX_RANDOM_B = 0x3fffffffffffffffL;

    private final Clock clock;
    private final RandomGenerator random;

    private long lastTimestamp = -1;
    private int randomA;
    private long randomB;

    public UuidV7Generator() {
        this(Clock.systemUTC(), new SecureRandom());
    }

    UuidV7Generator(Clock clock, RandomGenerator random) {
        this.clock = Objects.requireNonNull(clock, "clock");
        this.random = Objects.requireNonNull(random, "random");
    }

    public synchronized UUID generate() {
        long observedTimestamp = clock.millis();
        validateTimestamp(observedTimestamp);

        if (observedTimestamp > lastTimestamp) {
            lastTimestamp = observedTimestamp;
            randomA = (int) (random.nextLong() & MAX_RANDOM_A);
            randomB = random.nextLong() & MAX_RANDOM_B;
        } else {
            incrementSequence();
        }

        long mostSignificantBits = (lastTimestamp << 16) | 0x7000L | randomA;
        long leastSignificantBits = 0x8000000000000000L | randomB;
        return new UUID(mostSignificantBits, leastSignificantBits);
    }

    private void incrementSequence() {
        if (randomB < MAX_RANDOM_B) {
            randomB++;
            return;
        }
        if (randomA < MAX_RANDOM_A) {
            randomA++;
            randomB = 0;
            return;
        }
        throw new IllegalStateException(
                "UUIDv7 sequence exhausted for millisecond " + lastTimestamp);
    }

    private static void validateTimestamp(long timestamp) {
        if (timestamp < 0 || timestamp > MAX_TIMESTAMP) {
            throw new IllegalStateException("Clock value is outside the UUIDv7 48-bit timestamp range");
        }
    }
}
