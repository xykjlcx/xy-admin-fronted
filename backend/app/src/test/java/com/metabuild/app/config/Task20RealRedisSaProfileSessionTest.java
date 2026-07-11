package com.metabuild.app.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.metabuild.infrastructure.security.SaTokenSessionControl;
import com.metabuild.modules.admin.auth.application.RefreshTokenStore;
import com.metabuild.modules.admin.profile.application.ProfileSessionPort;
import com.metabuild.modules.admin.profile.application.ProfileService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@SpringBootTest(properties = {
        "metabuilder.auth.token-secret=0123456789abcdef0123456789abcdef",
        "metabuilder.auth.bootstrap-admin-password=task20-local-secret",
        "metabuilder.auth.deployment-mode=test",
        "spring.datasource.url=jdbc:postgresql://127.0.0.1:5432/metabuilder_task20_v13_final_20260712",
        "spring.datasource.username=ocean",
        "spring.datasource.password=",
        "spring.data.redis.host=127.0.0.1",
        "spring.data.redis.port=6379"
})
@EnabledIfEnvironmentVariable(named = "METABUILDER_TASK20_LOCAL", matches = "true")
class Task20RealRedisSaProfileSessionTest {
    private static final UUID USER = UUID.fromString("01900000-0000-7000-8000-000000000010");
    @Autowired SaTokenSessionControl sessions;
    @Autowired ProfileSessionPort profileSessions;
    @Autowired RefreshTokenStore refreshTokens;
    @Autowired JdbcTemplate jdbc;
    @Autowired ProfileService profiles;
    @Autowired BCryptPasswordEncoder passwords;

    @Test void realRedisAndSaPreserveCurrentRevokeOtherAndRevokeEveryRefreshToken() {
        sessions.kickoutAll(USER.toString());
        refreshTokens.revokeAll(USER);
        String current = sessions.login(USER.toString(), 1L).value();
        String other = sessions.login(USER.toString(), 1L).value();
        refreshTokens.issue(USER);
        refreshTokens.issue(USER);

        profileSessions.credentialsChanged(USER, id(current), 2L);

        assertThat(sessions.tokenActive(current)).isTrue();
        assertThat(sessions.tokenActive(other)).isFalse();
        assertThat(jdbc.queryForObject(
                "select count(*) from mb_refresh_token where user_id=? and revoked_at is null", Integer.class, USER))
                .isZero();
        String newGeneration = sessions.login(USER.toString(), 2L).value();
        profileSessions.credentialsChanged(USER, id(current), 2L);
        assertThat(sessions.tokenActive(newGeneration)).isTrue();
        sessions.kickoutAll(USER.toString());
    }

    @Test void passwordChangeThenNewLoginSurvivesReplayOfOldCredentialEvent() {
        sessions.kickoutAll(USER.toString());
        refreshTokens.revokeAll(USER);
        jdbc.update("delete from mb_credential_revocation_outbox where user_id=?", USER);
        jdbc.update("update mb_user set password_hash=? where id=?", passwords.encode("old-password"), USER);
        long before = jdbc.queryForObject("select credential_revision from mb_user where id=?", Long.class, USER);
        String oldSession = sessions.login(USER.toString(), before).value();

        profiles.changePassword(USER, "old-password", "new-password");

        long target = before + 1;
        assertThat(sessions.tokenActive(oldSession)).isFalse();
        UUID event = jdbc.queryForObject("select id from mb_credential_revocation_outbox where user_id=? and credential_revision=?",
                UUID.class, USER, target);
        assertThat(jdbc.queryForObject("select status from mb_credential_revocation_outbox where id=?", String.class, event))
                .isEqualTo("DONE");

        String newSession = sessions.login(USER.toString(), target).value();
        assertThat(sessions.credentialRevision(newSession)).isEqualTo(target);
        jdbc.update("""
                update mb_credential_revocation_outbox
                set status='FAILED',processed_at=null,next_attempt_at=current_timestamp,
                    worker_id=null,claimed_at=null,lease_until=null
                where id=?
                """, event);
        assertThat(profiles.reconcileCredentialRevocations(100)).isOne();

        assertThat(sessions.tokenActive(newSession)).isTrue();
        assertThat(jdbc.queryForObject("select status from mb_credential_revocation_outbox where id=?", String.class, event))
                .isEqualTo("DONE");
        sessions.kickoutAll(USER.toString());
    }

    private static String id(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8))).substring(0, 32);
        } catch (Exception failure) {
            throw new IllegalStateException(failure);
        }
    }
}
