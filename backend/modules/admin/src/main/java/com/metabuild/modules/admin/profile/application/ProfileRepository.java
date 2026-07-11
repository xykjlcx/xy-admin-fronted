package com.metabuild.modules.admin.profile.application;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

public interface ProfileRepository {
    record CredentialRevocation(UUID id, UUID userId, String protectedSessionId,
            long targetCredentialRevision, UUID workerId, int attempt) {}
    record PasswordChange(boolean changed, CredentialRevocation task) {}

    ProfileView get(UUID id);
    ProfileView update(UUID id, ProfileUpdate value);
    SecuritySettings security(UUID id);
    SecuritySettings updateSecurity(UUID id, SecuritySettings value);
    PreferenceView preferences(UUID id);
    PreferenceView updatePreferences(UUID id, PreferenceView value);
    PasswordChange changePasswordWithRecovery(UUID id, String current, String replacement,
            String protectedSessionId, UUID workerId, Duration lease, PasswordCodec passwords);
    List<CredentialRevocation> claimCredentialRevocations(UUID workerId, int limit, Duration lease);
    boolean completeCredentialRevocation(CredentialRevocation task);
    boolean failCredentialRevocation(CredentialRevocation task, String error);
}
