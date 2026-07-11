package com.metabuild.modules.admin.auth.application;

public record LoginResult(String accessToken, String refreshToken, long expiresInSeconds) {}
