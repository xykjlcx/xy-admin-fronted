package com.metabuild.app.security;

import com.metabuild.modules.admin.auth.application.RequestAuthorizationLoader;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import java.util.UUID;

public class RequestAuthorizationContext {
    private final RequestAuthorizationLoader.RequestScope request;
    public RequestAuthorizationContext(RequestAuthorizationLoader loader) { this.request = loader.newRequest(); }
    public AuthorizationSnapshot load(UUID userId) { return request.load(userId); }
}
