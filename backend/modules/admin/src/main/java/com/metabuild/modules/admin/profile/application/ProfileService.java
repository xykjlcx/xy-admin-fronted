package com.metabuild.modules.admin.profile.application;

import com.metabuild.shared.kernel.BadRequest;
import com.metabuild.shared.kernel.Conflict;
import com.metabuild.shared.kernel.NotFound;
import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

public final class ProfileService {
    private static final Duration REVOCATION_LEASE = Duration.ofSeconds(30);
    private final ProfileRepository repository;
    private final ProfileSessionPort sessions;
    private final PasswordCodec passwords;
    private final UUID workerId = UUID.randomUUID();

    public ProfileService(ProfileRepository repository, ProfileSessionPort sessions, PasswordCodec passwords) {
        this.repository = repository;
        this.sessions = sessions;
        this.passwords = passwords;
    }

    public ProfileView get(UUID userId) { return repository.get(userId); }

    public ProfileView update(UUID userId, ProfileUpdate value) {
        if (value == null || invalid(value.name(), 1, 128) || invalid(value.phone(), 0, 32)
                || invalid(value.location(), 1, 200) || invalid(value.title(), 1, 128)
                || invalid(value.language(), 1, 32) || invalid(value.timezone(), 1, 128)
                || invalid(value.bio(), 1, 2000)) {
            throw invalid("Profile payload is invalid");
        }
        return repository.update(userId, value);
    }

    public SecuritySettings security(UUID userId) { return repository.security(userId); }

    public SecuritySettings updateSecurity(UUID userId, SecuritySettings value) {
        if (value == null) throw invalid("Security settings are invalid");
        return repository.updateSecurity(userId, value);
    }

    public PreferenceView preferences(UUID userId) { return repository.preferences(userId); }

    public PreferenceView updatePreferences(UUID userId, PreferenceView value) {
        if (value == null || !Set.of("zh-CN", "en-US").contains(value.language())
                || invalid(value.timezone(), 1, 128)) {
            throw invalid("Preferences are invalid");
        }
        return repository.updatePreferences(userId, value);
    }

    public List<LoginDeviceView> devices(UUID userId) {
        String current = sessions.currentSessionId();
        return sessions.devices(userId).stream()
                .map(device -> new LoginDeviceView(device.id(), device.name(), device.location(), device.ip(),
                        device.lastActive(), Objects.equals(device.id(), current)))
                .toList();
    }

    public void changePassword(UUID userId, String current, String replacement) {
        if (blank(current) || replacement == null || replacement.length() < 8) {
            throw invalid("Password payload is invalid");
        }
        String protectedSessionId = sessions.currentSessionId();
        var change = repository.changePasswordWithRecovery(
                userId, current, replacement, protectedSessionId, workerId, REVOCATION_LEASE, passwords);
        if (!change.changed()) {
            throw new BadRequest(() -> "profile.password.mismatch", "Current password is incorrect");
        }
        var task = Objects.requireNonNull(change.task(), "Credential revocation task is required");
        try {
            sessions.credentialsChanged(userId, protectedSessionId, task.targetCredentialRevision());
            if (!repository.completeCredentialRevocation(task)) {
                throw new IllegalStateException("Credential revocation lease was lost");
            }
        } catch (RuntimeException failure) {
            repository.failCredentialRevocation(task, failure.getMessage());
            throw failure;
        }
    }

    public int reconcileCredentialRevocations(int limit) {
        if (limit < 1 || limit > 500) throw new IllegalArgumentException("bounded claim required");
        int completed = 0;
        for (var task : repository.claimCredentialRevocations(workerId, limit, REVOCATION_LEASE)) {
            try {
                sessions.credentialsChanged(task.userId(), task.protectedSessionId(), task.targetCredentialRevision());
                if (repository.completeCredentialRevocation(task)) completed++;
            } catch (RuntimeException failure) {
                repository.failCredentialRevocation(task, failure.getMessage());
            }
        }
        return completed;
    }

    public void removeDevice(UUID userId, String id) {
        if (Objects.equals(id, sessions.currentSessionId())) {
            throw new Conflict(() -> "profile.current-device.protected", "Current device cannot be removed");
        }
        if (devices(userId).stream().noneMatch(device -> device.id().equals(id))) {
            throw new NotFound(() -> "profile.device.not-found", "Device not found");
        }
        sessions.revoke(userId, id);
    }

    private static boolean invalid(String value, int min, int max) {
        if (value == null) return true;
        int length = value.trim().length();
        return length < min || length > max;
    }
    private static boolean blank(String value) { return value == null || value.isBlank(); }
    private static BadRequest invalid(String message) {
        return new BadRequest(() -> "request.validation.failed", message);
    }
}
