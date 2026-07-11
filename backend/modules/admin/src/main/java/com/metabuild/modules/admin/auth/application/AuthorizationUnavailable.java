package com.metabuild.modules.admin.auth.application;

import com.metabuild.shared.kernel.ServiceUnavailable;

public final class AuthorizationUnavailable extends ServiceUnavailable {
    public AuthorizationUnavailable() { super(() -> "auth.authorization-unavailable", "Authorization state unavailable"); }
}
