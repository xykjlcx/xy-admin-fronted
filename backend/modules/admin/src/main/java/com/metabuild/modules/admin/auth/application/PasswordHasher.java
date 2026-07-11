package com.metabuild.modules.admin.auth.application;

@FunctionalInterface
public interface PasswordHasher {
    String hash(String rawPassword);
}
