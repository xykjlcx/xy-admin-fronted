package com.metabuild.modules.admin.auth.application;

import java.time.Clock;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

final class AtomicRefreshTokenStore implements RefreshTokenStore {
    private record Entry(UUID userId, UUID familyId, boolean consumed, boolean revoked) {}
    private final Clock clock;
    private final Map<String, Entry> entries = new HashMap<>();
    private final Map<UUID, Set<String>> reverseIndex = new HashMap<>();

    AtomicRefreshTokenStore(Clock clock) { this.clock = clock; }

    @Override public synchronized String issue(UUID userId) {
        return issue(userId, UUID.randomUUID());
    }

    private String issue(UUID userId, UUID familyId) {
        String token = userId + "." + clock.instant().toEpochMilli() + "." + UUID.randomUUID();
        entries.put(token, new Entry(userId, familyId, false, false));
        reverseIndex.computeIfAbsent(userId, ignored -> new HashSet<>()).add(token);
        return token;
    }

    @Override public synchronized RefreshRotationOutcome rotate(String token) {
        var entry = entries.get(token);
        if (entry == null || entry.revoked()) return RefreshRotationOutcome.rejected();
        if (entry.consumed()) {
            revokeFamily(entry.familyId());
            return RefreshRotationOutcome.rejected();
        }
        entries.put(token, new Entry(entry.userId(), entry.familyId(), true, false));
        return RefreshRotationOutcome.success(new RefreshRotation(entry.userId(), issue(entry.userId(), entry.familyId())));
    }

    private void revokeFamily(UUID familyId) {
        entries.replaceAll((token, entry) -> entry.familyId().equals(familyId)
                ? new Entry(entry.userId(), entry.familyId(), entry.consumed(), true) : entry);
    }

    @Override public synchronized void revokeAll(UUID userId) {
        for (var token : reverseIndex.getOrDefault(userId, Set.of())) {
            var entry = entries.get(token);
            if (entry != null) entries.put(token, new Entry(entry.userId(), entry.familyId(), entry.consumed(), true));
        }
    }
    @Override public synchronized void revoke(String token) {
        var entry = entries.get(token);
        if (entry != null) entries.put(token, new Entry(entry.userId(), entry.familyId(), entry.consumed(), true));
    }
}
