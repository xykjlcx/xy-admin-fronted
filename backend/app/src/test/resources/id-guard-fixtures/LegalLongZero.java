package fixture;

final class LegalLongZero {

    private final long revision = 0L;
    private final long total = 0L;

    void resetRevision() {
        RevisionStore.setRevision(0L);
        LoginAudit.resetLoginAttempts(0L);
        LoginAudit.login(7L, 0L);
        RetryFirstLogin.login(0L, 7L);
    }

    private static final class RevisionStore {
        private static void setRevision(long ignored) {}
    }

    private static final class LoginAudit {
        private static void resetLoginAttempts(long ignored) {}

        private static void login(long userId, long retryCount) {}
    }

    private static final class RetryFirstLogin {
        private static void login(long retryCount, long userId) {}
    }
}
