package com.metabuild.shared.kernel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.random.RandomGenerator;
import org.junit.jupiter.api.Test;

class UuidV7Test {

    private static final long EPOCH_MILLIS = 1_700_000_000_123L;

    @Test
    void validatesVersionVariantAndExtractsUnixMilliseconds() {
        UUID uuid = uuidV7(EPOCH_MILLIS, 0x123, 0x456L);

        assertTrue(UuidV7.isValid(uuid));
        assertEquals(7, uuid.version());
        assertEquals(2, uuid.variant());
        assertEquals(EPOCH_MILLIS, UuidV7.unixEpochMillis(uuid));
        assertSame(uuid, UuidV7.require(uuid));
    }

    @Test
    void rejectsNullAndNonV7Values() {
        UUID versionFour = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

        assertFalse(UuidV7.isValid(null));
        assertFalse(UuidV7.isValid(versionFour));
        assertThrows(IllegalArgumentException.class, () -> UuidV7.require(versionFour));
        assertThrows(IllegalArgumentException.class, () -> UuidV7.unixEpochMillis(versionFour));
    }

    @Test
    void parsesOnlyCanonicalLowercaseV7Strings() {
        UUID expected = uuidV7(EPOCH_MILLIS, 0x123, 0x456L);
        String canonical = expected.toString();

        assertEquals(expected, UuidV7.parse(canonical));
        assertThrows(IllegalArgumentException.class, () -> UuidV7.parse(canonical.toUpperCase()));
        assertThrows(
                IllegalArgumentException.class,
                () -> UuidV7.parse("550e8400-e29b-41d4-a716-446655440000"));
        assertThrows(IllegalArgumentException.class, () -> UuidV7.parse("not-a-uuid"));
    }

    @Test
    void generatorIsMonotonicWithinTheSameMillisecond() {
        MutableClock clock = new MutableClock(EPOCH_MILLIS);
        UuidV7Generator generator = new UuidV7Generator(clock, zeroRandom());

        UUID first = generator.generate();
        UUID second = generator.generate();
        UUID third = generator.generate();

        assertCanonicalOrder(first, second);
        assertCanonicalOrder(second, third);
        assertEquals(EPOCH_MILLIS, UuidV7.unixEpochMillis(first));
        assertEquals(EPOCH_MILLIS, UuidV7.unixEpochMillis(third));
    }

    @Test
    void generatorStaysMonotonicWhenClockMovesBackwards() {
        MutableClock clock = new MutableClock(EPOCH_MILLIS);
        UuidV7Generator generator = new UuidV7Generator(clock, zeroRandom());
        UUID first = generator.generate();

        clock.setMillis(EPOCH_MILLIS - 100);
        UUID duringRollback = generator.generate();
        clock.setMillis(EPOCH_MILLIS + 1);
        UUID afterRecovery = generator.generate();

        assertCanonicalOrder(first, duringRollback);
        assertCanonicalOrder(duringRollback, afterRecovery);
        assertEquals(EPOCH_MILLIS, UuidV7.unixEpochMillis(duringRollback));
        assertEquals(EPOCH_MILLIS + 1, UuidV7.unixEpochMillis(afterRecovery));
    }

    @Test
    void generatorFailsInsteadOfRepeatingWhenSequenceSpaceIsExhausted() {
        MutableClock clock = new MutableClock(EPOCH_MILLIS);
        RandomGenerator maximumRandom = () -> -1L;
        UuidV7Generator generator = new UuidV7Generator(clock, maximumRandom);

        UUID lastAvailable = generator.generate();
        IllegalStateException failure = assertThrows(IllegalStateException.class, generator::generate);

        assertTrue(UuidV7.isValid(lastAvailable));
        assertTrue(failure.getMessage().contains("sequence exhausted"));
    }

    private static UUID uuidV7(long epochMillis, int randomA, long randomB) {
        long mostSignificantBits = (epochMillis << 16) | 0x7000L | (randomA & 0x0fffL);
        long leastSignificantBits = 0x8000000000000000L | (randomB & 0x3fffffffffffffffL);
        return new UUID(mostSignificantBits, leastSignificantBits);
    }

    private static RandomGenerator zeroRandom() {
        return () -> 0L;
    }

    private static void assertCanonicalOrder(UUID lower, UUID higher) {
        assertTrue(
                lower.toString().compareTo(higher.toString()) < 0,
                () -> lower + " must sort before " + higher);
    }

    private static final class MutableClock extends Clock {

        private long millis;

        private MutableClock(long millis) {
            this.millis = millis;
        }

        void setMillis(long millis) {
            this.millis = millis;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return Instant.ofEpochMilli(millis);
        }

        @Override
        public long millis() {
            return millis;
        }
    }
}
