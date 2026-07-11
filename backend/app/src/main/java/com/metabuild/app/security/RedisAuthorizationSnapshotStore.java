package com.metabuild.app.security;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.metabuild.modules.admin.auth.application.AuthorizationSnapshotStore;
import com.metabuild.modules.admin.auth.application.AuthorizationUnavailable;
import com.metabuild.shared.kernel.security.AuthorizationFence;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import com.metabuild.shared.kernel.security.AuthorizationState;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;

public final class RedisAuthorizationSnapshotStore implements AuthorizationSnapshotStore {
    private static final DefaultRedisScript<Long> INITIALIZE = new DefaultRedisScript<>("""
            local current = redis.call('GET', KEYS[1])
            if not current then redis.call('SET', KEYS[1], ARGV[2]); return 1 end
            local marker, revision = string.match(current, '^([^|]+)|(%d+)|')
            if not marker or not revision then return redis.error_reply('AUTHZ_BAD_STATE') end
            if marker == 'FENCE' then return 0 end
            if marker ~= 'READY' then return redis.error_reply('AUTHZ_BAD_MARKER') end
            if tonumber(revision) >= tonumber(ARGV[1]) then return 2 end
            redis.call('SET', KEYS[1], ARGV[2]); return 1
            """, Long.class);
    private static final DefaultRedisScript<Long> FENCE = new DefaultRedisScript<>("""
            local current = redis.call('GET', KEYS[1])
            if not current then return 0 end
            local marker, revision = string.match(current, '^([^|]+)|(%d+)|')
            if marker ~= 'READY' or tonumber(revision) ~= tonumber(ARGV[2]) then return 0 end
            redis.call('SET', KEYS[1], ARGV[1])
            redis.call('ZADD', KEYS[2], ARGV[3], ARGV[4])
            return 1
            """, Long.class);
    private static final DefaultRedisScript<Long> DELETE_FENCE = new DefaultRedisScript<>("""
            local current = redis.call('GET', KEYS[1])
            if not current then redis.call('ZREM', KEYS[2], ARGV[2]); return 1 end
            if current == ARGV[1] then
              redis.call('DEL', KEYS[1]); redis.call('ZREM', KEYS[2], ARGV[2]); return 1
            end
            return 0
            """, Long.class);
    private final StringRedisTemplate redis;
    private final ObjectMapper json;
    public RedisAuthorizationSnapshotStore(StringRedisTemplate redis, ObjectMapper json) { this.redis=redis; this.json=json; }

    @Override public boolean initializeReady(AuthorizationSnapshot snapshot) {
        try {
            String value = "READY|" + snapshot.revision() + "|" + json.writeValueAsString(snapshot);
            Long result = redis.execute(INITIALIZE, java.util.List.of(key(snapshot.userId())), Long.toString(snapshot.revision()), value);
            if (Long.valueOf(1).equals(result)) return true;
            if (Long.valueOf(2).equals(result)) {
                AuthorizationState existing = load(snapshot.userId());
                return existing instanceof AuthorizationSnapshot ready
                        && ready.userId().equals(snapshot.userId())
                        && ready.revision() >= snapshot.revision();
            }
            return false;
        } catch (JsonProcessingException | org.springframework.dao.DataAccessException exception) { throw new AuthorizationUnavailable(); }
    }

    @Override public AuthorizationState load(UUID userId) {
        try {
            String value = redis.opsForValue().get(key(userId));
            if (value == null) throw new AuthorizationUnavailable();
            String[] parts = value.split("\\|", 3);
            if (parts.length != 3) throw new AuthorizationUnavailable();
            if ("READY".equals(parts[0])) return json.readValue(parts[2], AuthorizationSnapshot.class);
            if ("FENCE".equals(parts[0])) return json.readValue(parts[2], AuthorizationFence.class);
            throw new AuthorizationUnavailable();
        } catch (AuthorizationUnavailable exception) { throw exception; }
        catch (Exception exception) { throw new AuthorizationUnavailable(); }
    }

    public void putFence(AuthorizationFence fence) {
        try {
            String value = fenceValue(fence);
            redis.execute(new DefaultRedisScript<>("redis.call('SET',KEYS[1],ARGV[1]); redis.call('ZADD',KEYS[2],ARGV[2],ARGV[3]); return 1", Long.class),
                    java.util.List.of(key(fence.userId()), "authz:fenced"), value,
                    Long.toString(fence.fencedAt().toEpochMilli()), fenceMember(fence));
        }
        catch (Exception exception) { throw new AuthorizationUnavailable(); }
    }
    @Override public boolean fence(AuthorizationFence fence) {
        try {
            String value = fenceValue(fence);
            return Long.valueOf(1).equals(redis.execute(FENCE,
                    java.util.List.of(key(fence.userId()), "authz:fenced"), value,
                    Long.toString(fence.targetRevision()), Long.toString(fence.fencedAt().toEpochMilli()), fenceMember(fence)));
        } catch (Exception exception) { throw new AuthorizationUnavailable(); }
    }
    @Override public boolean deleteIfFence(AuthorizationFence fence) {
        try {
            return Long.valueOf(1).equals(redis.execute(DELETE_FENCE,
                    java.util.List.of(key(fence.userId()), "authz:fenced"), fenceValue(fence), fenceMember(fence)));
        } catch (Exception exception) { throw new AuthorizationUnavailable(); }
    }
    @Override public void delete(UUID userId) {
        try { redis.delete(key(userId)); } catch (org.springframework.dao.DataAccessException exception) { throw new AuthorizationUnavailable(); }
    }
    private static String key(UUID userId) { return "authz:" + userId; }
    private String fenceValue(AuthorizationFence fence) throws JsonProcessingException {
        return "FENCE|" + fence.targetRevision() + "|" + json.writeValueAsString(fence);
    }
    public java.util.Set<String> fencedCandidates(Instant before, long limit) {
        try {
            java.util.Set<String> members = redis.opsForZSet().rangeByScore("authz:fenced", 0,
                    before.toEpochMilli(), 0, limit);
            return members == null ? java.util.Set.of() : java.util.Set.copyOf(members);
        } catch (org.springframework.dao.DataAccessException exception) { throw new AuthorizationUnavailable(); }
    }
    private static String fenceMember(AuthorizationFence fence) {
        return fence.userId() + "|" + fence.operationId();
    }
}
