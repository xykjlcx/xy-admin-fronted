package com.metabuild.modules.admin.auth.application;

@FunctionalInterface
public interface PasswordVerifier {
    boolean matches(String rawPassword, String encodedPassword);
}
