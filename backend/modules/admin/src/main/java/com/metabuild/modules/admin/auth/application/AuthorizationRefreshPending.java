package com.metabuild.modules.admin.auth.application;

import com.metabuild.shared.kernel.ServiceUnavailable;

public final class AuthorizationRefreshPending extends ServiceUnavailable {
    public AuthorizationRefreshPending() {
        super(() -> "auth.refresh.pending", "Change committed; affected users are temporarily denied access");
    }
}
