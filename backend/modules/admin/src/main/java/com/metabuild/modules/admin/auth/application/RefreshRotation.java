package com.metabuild.modules.admin.auth.application;

import java.util.UUID;

public record RefreshRotation(UUID userId, String token,long credentialRevision) {
    public RefreshRotation(UUID userId,String token){this(userId,token,0);}
}
