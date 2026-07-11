package com.metabuild.modules.admin.auth.application;

public record AccessSession(String token, long expiresInSeconds) {}
