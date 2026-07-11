package com.metabuild.modules.admin.auth.application;

import com.metabuild.modules.admin.auth.api.CurrentAuthorizationProvider;
import com.metabuild.shared.kernel.Unauthorized;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;

public final class CurrentAuthorizationService implements CurrentAuthorizationProvider {
    private final AccountSessionPort sessions;
    private final AuthorizationSnapshotStore snapshots;
    public CurrentAuthorizationService(AccountSessionPort sessions, AuthorizationSnapshotStore snapshots) {
        this.sessions=sessions; this.snapshots=snapshots;
    }
    @Override public AuthorizationSnapshot current() {
        var userId = sessions.currentUserId();
        if (userId == null) throw new Unauthorized(() -> "auth.token.invalid", "Authentication required");
        var state = snapshots.load(userId);
        if (!(state instanceof AuthorizationSnapshot snapshot)) throw new AuthorizationUnavailable();
        return snapshot;
    }
}
