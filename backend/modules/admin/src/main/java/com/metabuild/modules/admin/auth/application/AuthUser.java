package com.metabuild.modules.admin.auth.application;

import java.util.UUID;

public record AuthUser(UUID id, String username, String passwordHash, boolean enabled, boolean deleted, long credentialRevision) {
    public AuthUser(UUID id,String username,String passwordHash,boolean enabled,boolean deleted){this(id,username,passwordHash,enabled,deleted,0);}
}
