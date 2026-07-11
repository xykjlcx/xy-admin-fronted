package com.metabuild.modules.admin.auth.application;

import com.metabuild.shared.kernel.Unauthorized;

public final class RefreshTokenRejected extends Unauthorized {
    public RefreshTokenRejected() { super(() -> "auth.refresh-token.invalid", "Refresh token is invalid"); }
}
