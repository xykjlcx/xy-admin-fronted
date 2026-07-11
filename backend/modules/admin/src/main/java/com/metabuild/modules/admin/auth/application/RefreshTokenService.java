package com.metabuild.modules.admin.auth.application;

public final class RefreshTokenService {
    private final RefreshTokenStore tokens;
    private final AuthorizationSnapshotStore snapshots;

    public RefreshTokenService(RefreshTokenStore tokens, AuthorizationSnapshotStore snapshots) {
        this.tokens = tokens;
        this.snapshots = snapshots;
    }

    public RefreshRotation rotate(String token) {
        var outcome = tokens.rotate(token);
        if (outcome.status() != RefreshRotationOutcome.Status.SUCCESS) throw new RefreshTokenRejected();
        var rotation = outcome.rotation();
        try {
            if (!(snapshots.load(rotation.userId()) instanceof com.metabuild.shared.kernel.security.AuthorizationSnapshot)) {
                tokens.revokeAll(rotation.userId());
                throw new RefreshTokenRejected();
            }
        } catch (AuthorizationUnavailable exception) {
            tokens.revokeAll(rotation.userId());
            throw exception;
        }
        return rotation;
    }

    public RefreshResult rotateForAccess(String token, java.util.function.Function<java.util.UUID, AccessSession> accessIssuer) {
        var rotation = rotate(token);
        try {
            var access = accessIssuer.apply(rotation.userId());
            return new RefreshResult(access.token(), rotation.token(), access.expiresInSeconds());
        } catch (RuntimeException failure) {
            tokens.revokeAll(rotation.userId());
            throw failure;
        }
    }
}
