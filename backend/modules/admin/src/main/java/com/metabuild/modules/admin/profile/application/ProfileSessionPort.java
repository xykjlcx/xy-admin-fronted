package com.metabuild.modules.admin.profile.application;

import java.util.List;
import java.util.UUID;

public interface ProfileSessionPort {
    String currentSessionId();
    List<LoginDeviceView> devices(UUID userId);
    void revoke(UUID userId, String sessionId);
    void credentialsChanged(UUID userId, String protectedSessionId, long targetCredentialRevision);
}
