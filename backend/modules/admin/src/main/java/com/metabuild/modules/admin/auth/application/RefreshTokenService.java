package com.metabuild.modules.admin.auth.application;

public final class RefreshTokenService {
    private final RefreshTokenStore tokens;
    private final AuthorizationSnapshotStore snapshots;
    private final CredentialRevisionReader credentials;
    private final AccountSessionPort sessions;

    public RefreshTokenService(RefreshTokenStore tokens, AuthorizationSnapshotStore snapshots) {
        this(tokens,snapshots,userId->0,null);
    }
    public RefreshTokenService(RefreshTokenStore tokens,AuthorizationSnapshotStore snapshots,CredentialRevisionReader credentials,AccountSessionPort sessions){this.tokens=tokens;this.snapshots=snapshots;this.credentials=credentials;this.sessions=sessions;}

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

    public RefreshResult rotateForAccess(String token,
            java.util.function.BiFunction<java.util.UUID, Long, AccessSession> accessIssuer) {
        var rotation = rotate(token);
        AccessSession access=null;
        try {
            access = accessIssuer.apply(rotation.userId(), rotation.credentialRevision());
            if(credentials.credentialRevision(rotation.userId())!=rotation.credentialRevision()){
                tokens.revokeFamily(rotation.token());
                throw new RefreshTokenRejected();
            }
            return new RefreshResult(access.token(), rotation.token(), access.expiresInSeconds());
        } catch (RuntimeException failure) {
            tokens.revokeFamily(rotation.token());
            if(access!=null&&sessions!=null)try{sessions.logoutToken(access.token());}catch(RuntimeException cleanup){failure.addSuppressed(cleanup);}
            throw failure;
        }
    }
}
