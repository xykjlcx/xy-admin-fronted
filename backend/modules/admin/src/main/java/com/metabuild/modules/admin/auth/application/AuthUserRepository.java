package com.metabuild.modules.admin.auth.application;

public interface AuthUserRepository {
    AuthUser findByUsername(String username);
}
