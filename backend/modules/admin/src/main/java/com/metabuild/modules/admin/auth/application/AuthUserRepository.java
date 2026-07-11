package com.metabuild.modules.admin.auth.application;

public interface AuthUserRepository extends CredentialRevisionReader {
    AuthUser findByUsername(String username);
    @Override default long credentialRevision(java.util.UUID userId){return 0;}
}
