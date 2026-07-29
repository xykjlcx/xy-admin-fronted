package com.metabuild.modules.admin.auth.application;

import com.metabuild.shared.kernel.ErrorCode;
import com.metabuild.shared.kernel.Unauthorized;
import java.time.Clock;
import java.util.UUID;
import java.util.function.Supplier;
import com.metabuild.shared.kernel.security.AuthorizationFence;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;

public final class AuthenticationService {
    private static final ErrorCode INVALID_CREDENTIALS = () -> "auth.credentials.invalid";
    private static final ErrorCode CREDENTIALS_CHANGED = () -> "auth.credentials.changed";
    private final AuthUserRepository users;
    private final PasswordVerifier passwords;
    private final AuthorizationGraphRepository graphs;
    private final AuthorizationSnapshotCompiler compiler;
    private final AuthorizationSnapshotStore snapshots;
    private final AccountSessionPort sessions;
    private final RefreshTokenStore refreshTokens;
    private final Clock clock;
    private final Supplier<UUID> operationIds;
    private final LogoutRecoveryPort logoutRecovery;
    private final LoginAuditPort loginAudit;

    public AuthenticationService(AuthUserRepository users, PasswordVerifier passwords,
            AuthorizationGraphRepository graphs, AuthorizationSnapshotCompiler compiler,
            AuthorizationSnapshotStore snapshots, AccountSessionPort sessions,
            RefreshTokenStore refreshTokens, Clock clock, Supplier<UUID> operationIds,
            LogoutRecoveryPort logoutRecovery) {
        this(users,passwords,graphs,compiler,snapshots,sessions,refreshTokens,clock,operationIds,logoutRecovery,LoginAuditPort.NOOP);
    }
    public AuthenticationService(AuthUserRepository users, PasswordVerifier passwords,
            AuthorizationGraphRepository graphs, AuthorizationSnapshotCompiler compiler,
            AuthorizationSnapshotStore snapshots, AccountSessionPort sessions,
            RefreshTokenStore refreshTokens, Clock clock, Supplier<UUID> operationIds,
            LogoutRecoveryPort logoutRecovery,LoginAuditPort loginAudit) {
        this.users = users; this.passwords = passwords; this.graphs = graphs; this.compiler = compiler;
        this.snapshots = snapshots; this.sessions = sessions; this.refreshTokens = refreshTokens; this.clock = clock;
        this.operationIds = operationIds; this.logoutRecovery = logoutRecovery;
        this.loginAudit=loginAudit;
    }

    public LoginResult login(String username, String password) {
        return login(username,password,null,null);
    }
    public LoginResult login(String username, String password,String ip,String userAgent) {
        var user = users.findByUsername(username);
        if (user == null || !user.enabled() || user.deleted() || !passwords.matches(password, user.passwordHash())) {
            loginAudit.record(user==null?null:user.id(),username,false,INVALID_CREDENTIALS.code(),ip,userAgent);
            throw new Unauthorized(INVALID_CREDENTIALS, "Invalid credentials");
        }
        var refresh = refreshTokens.issue(user.id(),user.credentialRevision());
        AccessSession access = null;
        try {
            access = sessions.login(user.id(), user.credentialRevision());
            var snapshot = compiler.compile(graphs.load(user.id()), clock.instant());
            if (!snapshots.initializeReady(snapshot)) throw new AuthorizationUnavailable();
            if(users.credentialRevision(user.id())!=user.credentialRevision())
                throw new Unauthorized(CREDENTIALS_CHANGED,"Credentials changed during sign-in");
            loginAudit.record(user.id(),username,true,null,ip,userAgent);
            return new LoginResult(access.token(), refresh, access.expiresInSeconds());
        } catch (RuntimeException exception) {
            try { refreshTokens.revoke(refresh); } catch (RuntimeException cleanup) { exception.addSuppressed(cleanup); }
            if (access != null) {
                try { sessions.logoutToken(access.token()); } catch (RuntimeException cleanup) { exception.addSuppressed(cleanup); }
            }
            loginAudit.record(user.id(),username,false,exception instanceof com.metabuild.shared.kernel.DomainException domain?domain.errorCode().code():"auth.login.failed",ip,userAgent);
            throw exception;
        }
    }

    public void logoutAll(java.util.UUID userId) {
        var state = snapshots.load(userId);
        if (!(state instanceof AuthorizationSnapshot ready)) throw new AuthorizationUnavailable();
        var fence = new AuthorizationFence(userId, ready.revision(), operationIds.get(), clock.instant());
        if (!snapshots.fence(fence)) throw new AuthorizationUnavailable();
        try {
            refreshTokens.revokeAll(userId);
            sessions.kickoutAll(userId);
            if (!snapshots.deleteIfFence(fence)) throw new AuthorizationUnavailable();
        } catch (RuntimeException failure) {
            try { logoutRecovery.record(fence, failure); } catch (RuntimeException recoveryFailure) {
                failure.addSuppressed(recoveryFailure);
            }
            throw new AuthorizationUnavailable();
        }
    }
}
