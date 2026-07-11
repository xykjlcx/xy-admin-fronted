package com.metabuild.app.security;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.metabuild.modules.admin.auth.application.AuthorizationSnapshotStore;
import com.metabuild.modules.admin.auth.application.AuthorizationBatchSnapshotStore;
import com.metabuild.modules.admin.auth.application.AuthorizationUnavailable;
import com.metabuild.modules.admin.auth.application.AuthorizationFenceIndex;
import com.metabuild.shared.kernel.security.AuthorizationFence;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import com.metabuild.shared.kernel.security.AuthorizationState;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;

public final class RedisAuthorizationSnapshotStore implements AuthorizationSnapshotStore, AuthorizationBatchSnapshotStore, AuthorizationFenceIndex {
    private static final String BULK_FENCE_SOURCE = """
            local current=redis.call('GET',KEYS[1]); if not current then return 0 end
            local marker,revision=string.match(current,'^([^|]+)|(%d+)|');
            if marker~='READY' or tonumber(revision)~=tonumber(ARGV[2])-1 then return 0 end
            redis.call('SET',KEYS[1],ARGV[1]);redis.call('ZADD',KEYS[2],ARGV[3],ARGV[4]);return 1
            """;
    private static final String READY_CAS_SOURCE = """
            local current=redis.call('GET',KEYS[1]);if not current then return 0 end
            local marker,revision,payload=string.match(current,'^([^|]+)|(%d+)|(.+)$');
            if marker~='FENCE' or tonumber(revision)>tonumber(ARGV[2]) then return 0 end
            if not string.find(payload,ARGV[1],1,true) then return 0 end
            redis.call('SET',KEYS[1],ARGV[3]);redis.call('ZREM',KEYS[2],ARGV[4]);return 1
            """;
    private static final String COMPENSATE_SOURCE = """
            local current=redis.call('GET',KEYS[1]);if not current then return 0 end
            local marker,revision,payload=string.match(current,'^([^|]+)|(%d+)|(.+)$');
            if marker~='FENCE' or not string.find(payload,ARGV[1],1,true) then return 0 end
            redis.call('SET',KEYS[1],ARGV[2]);redis.call('ZREM',KEYS[2],ARGV[3]);return 1
            """;
    private static final DefaultRedisScript<Long> TERMINAL_DELETE = new DefaultRedisScript<>("""
            local current=redis.call('GET',KEYS[1]);if not current then redis.call('ZREM',KEYS[2],ARGV[3]);return 1 end
            local marker,revision,payload=string.match(current,'^([^|]+)|(%d+)|(.+)$');
            if marker~='FENCE' or tonumber(revision)~=tonumber(ARGV[2]) or not string.find(payload,ARGV[1],1,true) then return 0 end
            redis.call('DEL',KEYS[1]);redis.call('ZREM',KEYS[2],ARGV[3]);return 1
            """,Long.class);
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
    @Override public java.util.List<AuthorizationFence> fencedCandidates(Instant before, int limit) {
        if (limit < 1 || limit > 500) throw new IllegalArgumentException("bounded fence scan required");
        try {
            java.util.Set<String> members = redis.opsForZSet().rangeByScore("authz:fenced", 0,
                    before.toEpochMilli(), 0, limit);
            if (members == null || members.isEmpty()) return java.util.List.of();
            java.util.List<String> ordered = new java.util.ArrayList<>(members);
            java.util.List<String> keys = ordered.stream().map(member -> key(UUID.fromString(member.substring(0,member.indexOf('|'))))).toList();
            java.util.List<String> values = redis.opsForValue().multiGet(keys);
            var result = new java.util.ArrayList<AuthorizationFence>();
            for (int i=0;i<ordered.size();i++) {
                String value=values==null?null:values.get(i);
                if (value==null || !value.startsWith("FENCE|")) { redis.opsForZSet().remove("authz:fenced",ordered.get(i)); continue; }
                AuthorizationFence fence=json.readValue(value.split("\\|",3)[2],AuthorizationFence.class);
                if (ordered.get(i).equals(fenceMember(fence))) result.add(fence);
                else redis.opsForZSet().remove("authz:fenced",ordered.get(i));
            }
            return java.util.List.copyOf(result);
        } catch (Exception exception) { throw new AuthorizationUnavailable(); }
    }
    private static String fenceMember(AuthorizationFence fence) {
        return fence.userId() + "|" + fence.operationId();
    }

    @Override public java.util.Set<UUID> fenceAll(UUID operationId, java.util.Map<UUID,Long> targets, Instant at) {
        try {
            java.util.List<UUID> users=new java.util.ArrayList<>(targets.keySet());
            java.util.List<Object> replies=redis.executePipelined((org.springframework.data.redis.core.RedisCallback<Object>) connection->{
                for(UUID user:users){var fence=new AuthorizationFence(user,targets.get(user),operationId,at);connection.scriptingCommands().eval(bytes(BULK_FENCE_SOURCE),org.springframework.data.redis.connection.ReturnType.INTEGER,2,
                        bytes(key(user)),bytes("authz:fenced"),bytes(fenceValueUnchecked(fence)),bytes(Long.toString(fence.targetRevision())),bytes(Long.toString(at.toEpochMilli())),bytes(fenceMember(fence)));}return null;});
            var fenced=new java.util.LinkedHashSet<UUID>();for(int i=0;i<replies.size();i++)if(Long.valueOf(1).equals(replies.get(i)))fenced.add(users.get(i));return java.util.Set.copyOf(fenced);
        } catch(Exception e){throw new AuthorizationUnavailable();}
    }
    @Override public boolean readyAll(UUID operationId,java.util.Map<UUID,AuthorizationSnapshot> values){
        try{
            java.util.List<UUID> users=new java.util.ArrayList<>(values.keySet());
            java.util.List<Object> replies=redis.executePipelined((org.springframework.data.redis.core.RedisCallback<Object>) connection->{for(UUID user:users){var snapshot=values.get(user);String ready=readyValue(snapshot);connection.scriptingCommands().eval(bytes(READY_CAS_SOURCE),org.springframework.data.redis.connection.ReturnType.INTEGER,2,bytes(key(user)),bytes("authz:fenced"),bytes(operationId.toString()),bytes(Long.toString(snapshot.revision())),bytes(ready),bytes(user+"|"+operationId));}return null;});
            return replies.size()==users.size()&&replies.stream().allMatch(Long.valueOf(1)::equals);
        }catch(Exception e){throw new AuthorizationUnavailable();}
    }
    @Override public void compensate(UUID operationId,java.util.Map<UUID,AuthorizationSnapshot> values){
        try{redis.executePipelined((org.springframework.data.redis.core.RedisCallback<Object>) connection->{for(var entry:values.entrySet()){String ready=readyValue(entry.getValue());connection.scriptingCommands().eval(bytes(COMPENSATE_SOURCE),org.springframework.data.redis.connection.ReturnType.INTEGER,2,bytes(key(entry.getKey())),bytes("authz:fenced"),bytes(operationId.toString()),bytes(ready),bytes(entry.getKey()+"|"+operationId));}return null;});}catch(Exception e){throw new AuthorizationUnavailable();}
    }
    @Override public boolean terminalDelete(UUID operationId,UUID user,long revision){
        try{return Long.valueOf(1).equals(redis.execute(TERMINAL_DELETE,java.util.List.of(key(user),"authz:fenced"),operationId.toString(),Long.toString(revision),user+"|"+operationId));}catch(Exception e){throw new AuthorizationUnavailable();}
    }
    @Override public boolean initializeAll(java.util.Map<UUID,AuthorizationSnapshot> values){
        try{
            java.util.List<AuthorizationSnapshot> snapshots=new java.util.ArrayList<>(values.values());
            java.util.List<Object> replies=redis.executePipelined((org.springframework.data.redis.core.RedisCallback<Object>)connection->{for(var snapshot:snapshots)connection.scriptingCommands().eval(bytes(INITIALIZE.getScriptAsString()),org.springframework.data.redis.connection.ReturnType.INTEGER,1,bytes(key(snapshot.userId())),bytes(Long.toString(snapshot.revision())),bytes(readyValue(snapshot)));return null;});
            return replies.size()==snapshots.size()&&replies.stream().allMatch(reply->Long.valueOf(1).equals(reply)||Long.valueOf(2).equals(reply));
        }catch(Exception e){throw new AuthorizationUnavailable();}
    }
    private String fenceValueUnchecked(AuthorizationFence fence){try{return fenceValue(fence);}catch(JsonProcessingException e){throw new IllegalStateException(e);}}
    private String readyValue(AuthorizationSnapshot snapshot){try{return "READY|"+snapshot.revision()+"|"+json.writeValueAsString(snapshot);}catch(JsonProcessingException e){throw new IllegalStateException(e);}}
    private static byte[] bytes(String value){return value.getBytes(java.nio.charset.StandardCharsets.UTF_8);}
}
