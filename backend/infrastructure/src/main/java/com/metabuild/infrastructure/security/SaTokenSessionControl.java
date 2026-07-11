package com.metabuild.infrastructure.security;

import cn.dev33.satoken.stp.StpUtil;

/** 隔离 Sa-Token 静态 API 的窄门面。 */
public class SaTokenSessionControl {
    public Token login(String userId) {
        try {
            StpUtil.login(userId);
            var token = StpUtil.getTokenInfo();
            return new Token(token.tokenValue, token.tokenTimeout);
        } catch (RuntimeException failure) {
            try { StpUtil.logout(userId); } catch (RuntimeException cleanup) { failure.addSuppressed(cleanup); }
            throw failure;
        }
    }
    public void kickoutAll(String userId) { StpUtil.kickout(userId); }
    public void logoutToken(String token) { StpUtil.logoutByTokenValue(token); }
    public String currentUserId() {
        Object loginId = StpUtil.getLoginIdDefaultNull();
        return loginId == null ? null : loginId.toString();
    }
    public record Token(String value, long expiresInSeconds) {}
}
