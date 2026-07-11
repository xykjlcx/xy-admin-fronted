package com.metabuild.modules.admin.auth.persistence;

import com.metabuild.modules.admin.auth.application.RefreshRotation;
import com.metabuild.modules.admin.auth.application.RefreshRotationOutcome;
import com.metabuild.modules.admin.auth.application.RefreshTokenStore;
import com.metabuild.shared.kernel.UuidV7Generator;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

public final class JdbcRefreshTokenStore implements RefreshTokenStore {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final UuidV7Generator ids;
    private final Clock clock;
    private final Duration lifetime;

    public JdbcRefreshTokenStore(JdbcTemplate jdbc, PlatformTransactionManager transactions,
            UuidV7Generator ids, Clock clock, Duration lifetime) {
        this.jdbc=jdbc; this.transactions=new TransactionTemplate(transactions); this.ids=ids; this.clock=clock;
        this.lifetime=lifetime;
    }

    @Override public String issue(UUID userId) { return issue(userId, ids.generate()); }

    private String issue(UUID userId, UUID familyId) {
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString((ids.generate()+":"+UUID.randomUUID()).getBytes(StandardCharsets.UTF_8));
        jdbc.update("insert into mb_refresh_token(id,user_id,family_id,token_hash,expires_at) values (?,?,?,?,?)",
                ids.generate(), userId, familyId, hash(raw), OffsetDateTime.ofInstant(clock.instant().plus(lifetime), ZoneOffset.UTC));
        return raw;
    }

    @Override public RefreshRotationOutcome rotate(String token) {
        return transactions.execute(status -> {
            Boolean locked = jdbc.queryForObject("select pg_try_advisory_xact_lock(hashtextextended(?, 0))", Boolean.class, hash(token));
            if (!Boolean.TRUE.equals(locked)) return RefreshRotationOutcome.inFlight();
            var rows = jdbc.query("""
                    select t.id,t.user_id,t.family_id,t.expires_at,t.consumed_at,t.revoked_at,
                           u.status as user_status,u.deleted_at as user_deleted_at
                    from mb_refresh_token t join mb_user u on u.id=t.user_id
                    where t.token_hash=? for update of t,u
                    """, (rs, row) -> new TokenRow(rs.getObject("id",UUID.class), rs.getObject("user_id",UUID.class),
                    rs.getObject("family_id",UUID.class), rs.getObject("expires_at",OffsetDateTime.class),
                    rs.getObject("consumed_at",OffsetDateTime.class), rs.getObject("revoked_at",OffsetDateTime.class),
                    "ACTIVE".equals(rs.getString("user_status")) && rs.getObject("user_deleted_at") == null), hash(token));
            if (rows.isEmpty()) return RefreshRotationOutcome.rejected();
            var old = rows.getFirst();
            if (old.revoked != null || old.expires.isBefore(OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC))) return RefreshRotationOutcome.rejected();
            if (old.consumed != null) {
                jdbc.update("update mb_refresh_token set revoked_at=current_timestamp where family_id=? and revoked_at is null", old.familyId);
                return RefreshRotationOutcome.rejected();
            }
            if (!old.userEnabled) {
                jdbc.update("update mb_refresh_token set revoked_at=current_timestamp where family_id=? and revoked_at is null", old.familyId);
                return RefreshRotationOutcome.rejected();
            }
            jdbc.update("update mb_refresh_token set consumed_at=current_timestamp where id=?", old.id);
            String replacement = issue(old.userId, old.familyId);
            jdbc.update("update mb_refresh_token set replaced_by_id=(select id from mb_refresh_token where token_hash=?) where id=?", hash(replacement), old.id);
            return RefreshRotationOutcome.success(new RefreshRotation(old.userId, replacement));
        });
    }

    @Override public void revokeAll(UUID userId) {
        jdbc.update("update mb_refresh_token set revoked_at=current_timestamp where user_id=? and revoked_at is null", userId);
    }
    @Override public void revoke(String token) {
        jdbc.update("update mb_refresh_token set revoked_at=current_timestamp where token_hash=? and revoked_at is null", hash(token));
    }

    private static String hash(String token) {
        try { return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException exception) { throw new IllegalStateException(exception); }
    }
    private record TokenRow(UUID id, UUID userId, UUID familyId, OffsetDateTime expires, OffsetDateTime consumed, OffsetDateTime revoked, boolean userEnabled) {}
}
