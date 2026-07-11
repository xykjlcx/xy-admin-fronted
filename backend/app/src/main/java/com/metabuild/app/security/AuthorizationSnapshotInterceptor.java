package com.metabuild.app.security;

import com.metabuild.infrastructure.security.SaTokenSessionControl;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.UUID;
import org.springframework.web.servlet.HandlerInterceptor;

public final class AuthorizationSnapshotInterceptor implements HandlerInterceptor {
    private final SaTokenSessionControl sessions;
    private final RequestAuthorizationContext context;
    public AuthorizationSnapshotInterceptor(SaTokenSessionControl sessions, RequestAuthorizationContext context) {
        this.sessions=sessions; this.context=context;
    }
    @Override public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String userId = sessions.currentUserId();
        if (userId != null) context.load(UUID.fromString(userId));
        return true;
    }
}
