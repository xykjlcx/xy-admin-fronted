package fixture;

import java.util.Objects;

final class SystemPrincipalZeroViolation {

    private static final long SYSTEM_PRINCIPAL = 0L;

    private final Long principal = 0L;
    private final long userId = 0L;
    private final Long loginId = 0L;
    private final long systemPrincipalId = 0;

    long currentUserId() {
        return 0L;
    }

    boolean isSystem() {
        return Long.valueOf(0L).equals(userId());
    }

    long userIdOrSystem() {
        return isSystem() ? 0L : userId();
    }

    boolean hasLegacySentinel() {
        return userId() == 0L;
    }

    boolean hasNonPositiveSentinel() {
        return userId() <= 0L;
    }

    boolean usesObjectsEquality() {
        return Objects.equals(userId(), 0L);
    }

    void authenticate() {
        SystemLogin.login(SYSTEM_PRINCIPAL, 0L);
        new CurrentUserLike(-0L);
    }

    private long userId() {
        return 7L;
    }

    private static final class SystemLogin {
        private static void login(long loginId, long retryCount) {}
    }

    private record CurrentUserLike(long userId) {
    }
}
