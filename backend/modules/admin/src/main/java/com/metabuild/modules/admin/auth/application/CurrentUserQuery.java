package com.metabuild.modules.admin.auth.application;

import com.metabuild.shared.kernel.Unauthorized;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import com.metabuild.modules.admin.auth.api.CurrentAuthorizationProvider;
import java.util.UUID;

public final class CurrentUserQuery {
    private final CurrentAuthorizationProvider authorization;
    private final CurrentUserRepository users;

    public CurrentUserQuery(CurrentAuthorizationProvider authorization, CurrentUserRepository users) {
        this.authorization = authorization; this.users = users;
    }
    public CurrentUserView load() {
        var snapshot = authorization.current();
        UUID userId = snapshot.userId();
        var user = users.find(userId);
        if (user == null) throw new Unauthorized(() -> "auth.token.invalid", "Authentication required");
        return new CurrentUserView(user, snapshot);
    }
}
