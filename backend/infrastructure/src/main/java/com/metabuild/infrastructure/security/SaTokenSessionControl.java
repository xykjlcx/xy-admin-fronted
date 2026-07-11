package com.metabuild.infrastructure.security;

import cn.dev33.satoken.stp.StpUtil;
import cn.dev33.satoken.exception.NotLoginException;
import com.metabuild.shared.kernel.Unauthorized;

/** 隔离 Sa-Token 静态 API 的窄门面。 */
public class SaTokenSessionControl {
    public Token login(String userId) {
        return loginInternal(userId, null);
    }
    public Token login(String userId, long credentialRevision) {
        return loginInternal(userId, credentialRevision);
    }
    private Token loginInternal(String userId, Long credentialRevision) {
        String token = null;
        try {
            token = createLoginSession(userId);
            afterLoginSessionCreated(token);
            if (credentialRevision != null) storeCredentialRevision(token, credentialRevision);
            return new Token(token, tokenTimeout(token));
        } catch (RuntimeException failure) {
            if (token != null) try { logoutToken(token); } catch (RuntimeException cleanup) { failure.addSuppressed(cleanup); }
            throw failure;
        }
    }
    protected String createLoginSession(String userId) { return StpUtil.createLoginSession(userId); }
    protected long tokenTimeout(String token) { return StpUtil.getTokenTimeout(token); }
    protected void afterLoginSessionCreated(String token) {}
    protected void storeCredentialRevision(String token, long credentialRevision) {
        StpUtil.getStpLogic().getTokenSessionByToken(token, true).set("credentialRevision", credentialRevision);
    }
    public void kickoutAll(String userId) { StpUtil.kickout(userId); }
    public void logoutToken(String token) { StpUtil.logoutByTokenValue(token); }
    public String currentTokenValue() { return StpUtil.getTokenValue(); }
    public java.util.List<String> tokenValues(String userId) { return StpUtil.getTokenValueListByLoginId(userId); }
    public boolean tokenActive(String token) { return StpUtil.getLoginIdByToken(token) != null; }
    public Long credentialRevision(String token) {
        var session = StpUtil.getStpLogic().getTokenSessionByToken(token, false);
        if (session == null) return null;
        Object value = session.get("credentialRevision");
        if (value instanceof Number number) return number.longValue();
        if (value instanceof String text) try { return Long.valueOf(text); } catch (NumberFormatException ignored) {}
        return null;
    }
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
