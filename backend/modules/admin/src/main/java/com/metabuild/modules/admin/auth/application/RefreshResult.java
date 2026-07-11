package com.metabuild.modules.admin.auth.application;

public record RefreshResult(String accessToken, String refreshToken, long expiresInSeconds) {}
