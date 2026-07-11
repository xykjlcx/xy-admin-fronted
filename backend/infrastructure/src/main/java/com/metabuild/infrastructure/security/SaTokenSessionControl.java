package com.metabuild.infrastructure.security;

import cn.dev33.satoken.stp.StpUtil;
import cn.dev33.satoken.exception.NotLoginException;
import com.metabuild.shared.kernel.Unauthorized;

/** 隔离 Sa-Token 静态 API 的窄门面。 */
public class SaTokenSessionControl {
    public Token login(String userId) {
        String token = null;
        try {
            token = createLoginSession(userId);
            afterLoginSessionCreated(token);
            return new Token(token, tokenTimeout(token));
        } catch (RuntimeException failure) {
            if (token != null) try { logoutToken(token); } catch (RuntimeException cleanup) { failure.addSuppressed(cleanup); }
            throw failure;
        }
    }
    protected String createLoginSession(String userId) { return StpUtil.createLoginSession(userId); }
    protected long tokenTimeout(String token) { return StpUtil.getTokenTimeout(token); }
    protected void afterLoginSessionCreated(String token) {}
    public void kickoutAll(String userId) { StpUtil.kickout(userId); }
    public void logoutToken(String token) { StpUtil.logoutByTokenValue(token); }
    public String currentUserId() {
        try {
            return StpUtil.getLoginId().toString();
        } catch (NotLoginException failure) {
            if (NotLoginException.NOT_TOKEN.equals(failure.getType())) return null;
            if (NotLoginException.TOKEN_TIMEOUT.equals(failure.getType()))
                throw new Unauthorized(() -> "auth.token.expired", "Access token expired");
            throw new Unauthorized(() -> "auth.token.invalid", "Access token is invalid");
        }
    }
    public record Token(String value, long expiresInSeconds) {}
}
