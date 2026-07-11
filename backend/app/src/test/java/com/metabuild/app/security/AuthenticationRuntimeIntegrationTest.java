package com.metabuild.app.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

import cn.dev33.satoken.stp.StpUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.metabuild.modules.admin.auth.application.AuthenticationService;
import com.metabuild.modules.admin.auth.application.AuthorizationUnavailable;
import com.metabuild.modules.admin.auth.application.AuthorizationGraphRepository;
import com.metabuild.modules.admin.auth.application.AuthorizationSnapshotCompiler;
import com.metabuild.modules.admin.auth.application.LoginResult;
import com.metabuild.modules.admin.auth.application.RefreshTokenRejected;
import com.metabuild.modules.admin.auth.application.RefreshTokenService;
import com.metabuild.modules.admin.menus.application.MenuRepository;
import java.util.UUID;
import java.util.Set;
import java.time.Instant;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import com.metabuild.shared.kernel.security.AuthorizationFence;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import com.metabuild.shared.kernel.Unauthorized;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import javax.sql.DataSource;
import net.ttddyy.dsproxy.QueryCountHolder;
import net.ttddyy.dsproxy.support.ProxyDataSourceBuilder;
import com.metabuild.modules.admin.auth.persistence.JdbcAuthorizationGraphRepository;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;

@SpringBootTest(properties = {
        "metabuilder.auth.token-secret=0123456789abcdef0123456789abcdef",
        "metabuilder.auth.bootstrap-admin-password=task12-local-secret",
        "metabuilder.auth.deployment-mode=test",
        "spring.datasource.url=jdbc:postgresql://127.0.0.1:54329/metabuilder",
        "spring.datasource.username=metabuilder",
        "spring.datasource.password=",
        "spring.data.redis.host=127.0.0.1",
        "spring.data.redis.port=63799"
})
@AutoConfigureMockMvc
@Import(AuthenticationRuntimeIntegrationTest.AuthProbe.class)
@EnabledIfEnvironmentVariable(named = "METABUILDER_TASK12_LOCAL", matches = "true")
class AuthenticationRuntimeIntegrationTest {
    private static final UUID ADMIN = UUID.fromString("01900000-0000-7000-8000-000000000010");
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired StringRedisTemplate redis;
    @Autowired RefreshTokenService refreshTokens;
    @Autowired AuthenticationService authentication;
    @Autowired RedisAuthorizationSnapshotStore snapshots;
    @Autowired AuthorizationGraphRepository graphs;
    @Autowired AuthorizationSnapshotCompiler compiler;
    @Autowired DataSource dataSource;
    @Autowired MenuRepository menus;

    @Test
    void realPostgresRedisAndSaTokenCompleteLoginRotationReplayAndLogout() throws Exception {
        jdbc.update("delete from mb_refresh_token where user_id=?", ADMIN);
        redis.delete("authz:" + ADMIN);

        String body = mvc.perform(post("/__task12/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"task12-local-secret\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        LoginResult login = json.readValue(body, LoginResult.class);

        assertThat(login.accessToken()).isNotBlank();
        assertThat(redis.opsForValue().get("authz:" + ADMIN)).startsWith("READY|0|");
        assertThat(jdbc.queryForObject("select count(*) from mb_refresh_token where user_id=? and token_hash<>?",
                Integer.class, ADMIN, login.refreshToken())).isEqualTo(1);
        var session = StpUtil.getSessionByLoginId(ADMIN.toString(), false);
        assertThat(session).isNotNull();
        assertThat(session.getDataMap()).doesNotContainKeys("roles", "permissions", "dataScope", "authorizationSnapshot");

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + login.accessToken()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.systemAdmin").value(true))
                .andExpect(jsonPath("$.dataScope.unrestricted").value(true));
        mvc.perform(get("/api/subsystems").header("Authorization", "Bearer " + login.accessToken()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].key").value("admin"));
        mvc.perform(get("/api/menus").param("subsystem", "admin")
                        .header("Authorization", "Bearer " + login.accessToken()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.path == '/admin/users')]").isEmpty());
        mvc.perform(get("/api/dashboard/overview").header("Authorization", "Bearer " + login.accessToken()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.company.name").value("MetaBuilder"));

        UUID dashboard = UUID.fromString("01900000-0000-7000-8000-000000000201");
        jdbc.update("insert into mb_menu_customization(menu_id,parent_overridden,parent_id) values (?,true,null) on conflict (menu_id) do update set parent_overridden=true,parent_id=null", dashboard);
        assertThat(menus.findActive("admin")).filteredOn(row -> row.id().equals(dashboard)).singleElement()
                .extracting(com.metabuild.modules.admin.menus.application.MenuRow::parentId).isNull();
        jdbc.update("delete from mb_menu_customization where menu_id=?", dashboard);

        String readyBeforeFailedLogin = redis.opsForValue().get("authz:" + ADMIN);
        redis.opsForValue().set("authz:" + ADMIN, "READY|99|not-json");
        mvc.perform(post("/__task12/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"task12-local-secret\"}"))
                .andExpect(status().isServiceUnavailable());
        assertThat(StpUtil.getLoginIdByToken(login.accessToken())).isEqualTo(ADMIN.toString());
        assertThat(StpUtil.getTokenValueListByLoginId(ADMIN.toString())).containsExactly(login.accessToken());
        assertThat(StpUtil.getSessionByLoginId(ADMIN.toString(), false).getId()).isEqualTo(session.getId());
        redis.opsForValue().set("authz:" + ADMIN, readyBeforeFailedLogin);

        var winners = new ConcurrentLinkedQueue<String>();
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 2; i++) executor.submit(() -> {
                ready.countDown(); start.await();
                try { winners.add(refreshTokens.rotate(login.refreshToken()).token()); } catch (RefreshTokenRejected ignored) {}
                return null;
            });
            assertThat(ready.await(2, TimeUnit.SECONDS)).isTrue();
            start.countDown();
        }
        assertThat(winners).hasSize(1);
        String rotated = winners.element();
        assertThat(rotated).isNotEqualTo(login.refreshToken());
        String next = refreshTokens.rotate(rotated).token();
        assertThat(next).isNotBlank();
        assertThatThrownBy(() -> refreshTokens.rotate(login.refreshToken())).isInstanceOf(RefreshTokenRejected.class);
        assertThatThrownBy(() -> refreshTokens.rotate(next)).isInstanceOf(RefreshTokenRejected.class);
        assertThat(jdbc.queryForObject(
                "select count(*) from mb_refresh_token where user_id=? and revoked_at is null",
                Integer.class, ADMIN)).isZero();

        authentication.logoutAll(ADMIN);
        assertThat(StpUtil.getSessionByLoginId(ADMIN.toString(), false)).isNull();
        assertThat(redis.hasKey("authz:" + ADMIN)).isFalse();
        assertThat(jdbc.queryForObject("select count(*) from mb_refresh_token where user_id=? and revoked_at is null", Integer.class, ADMIN)).isZero();

        var logoutFence = new AuthorizationFence(ADMIN, 1,
                UUID.fromString("01900000-0000-7000-8000-000000000099"), Instant.EPOCH);
        snapshots.putFence(logoutFence);
        assertThat(snapshots.fencedCandidates(Instant.now(), 10))
                .contains(ADMIN + "|" + logoutFence.operationId());
        assertThatThrownBy(() -> authentication.login("admin", "task12-local-secret"))
                .isInstanceOf(AuthorizationUnavailable.class);
        assertThat(snapshots.deleteIfFence(logoutFence)).isTrue();
        assertThat(snapshots.fencedCandidates(Instant.now(), 10)).isEmpty();
        redis.opsForValue().set("authz:" + ADMIN, "not-json");
        assertThatThrownBy(() -> snapshots.load(ADMIN)).isInstanceOf(AuthorizationUnavailable.class);

        jdbc.update("update mb_user set status='DISABLED' where id=?", ADMIN);
        assertThatThrownBy(() -> authentication.login("admin", "task12-local-secret")).isInstanceOf(Unauthorized.class);
        jdbc.update("update mb_user set status='ACTIVE', deleted_at=current_timestamp where id=?", ADMIN);
        assertThatThrownBy(() -> authentication.login("admin", "task12-local-secret")).isInstanceOf(Unauthorized.class);
        jdbc.update("update mb_user set deleted_at=null where id=?", ADMIN);

        UUID systemRole = UUID.fromString("01900000-0000-7000-8000-000000000020");
        jdbc.update("delete from mb_user_role where user_id=?", ADMIN);
        redis.delete("authz:" + ADMIN);
        var noRoleLogin = authentication.login("admin", "task12-local-secret");
        AuthorizationSnapshot noRole = (AuthorizationSnapshot) snapshots.load(ADMIN);
        assertThat(noRole.roles()).isEmpty();
        assertThat(noRole.dataScope().all()).isFalse();
        assertThat(noRole.dataScope().includeSelf()).isFalse();
        assertThat(noRole.dataScope().deptIds()).isEmpty();
        mvc.perform(get("/api/dashboard/overview").header("Authorization", "Bearer " + noRoleLogin.accessToken()))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("auth.permission.denied"));
        authentication.logoutAll(ADMIN);
        verifyRealScopeMatrix();
        jdbc.update("insert into mb_user_role(user_id,role_id) values (?,?) on conflict do nothing", ADMIN, systemRole);
    }

    private void verifyRealScopeMatrix() {
        UUID root = UUID.fromString("01900000-0000-7000-8000-000000000001");
        UUID child = UUID.fromString("01900000-0000-7000-8000-000000000031");
        UUID custom = UUID.fromString("01900000-0000-7000-8000-000000000032");
        UUID all = UUID.fromString("01900000-0000-7000-8000-000000000041");
        UUID self = UUID.fromString("01900000-0000-7000-8000-000000000042");
        UUID own = UUID.fromString("01900000-0000-7000-8000-000000000043");
        UUID below = UUID.fromString("01900000-0000-7000-8000-000000000044");
        UUID customRole = UUID.fromString("01900000-0000-7000-8000-000000000045");
        jdbc.update("insert into mb_dept(id,parent_id,code,name) values (?,?,?,?) on conflict do nothing", child, root, "TASK12_CHILD", "Task12 child");
        jdbc.update("insert into mb_dept(id,parent_id,code,name) values (?,?,?,?) on conflict do nothing", custom, root, "TASK12_CUSTOM", "Task12 custom");
        insertRole(all, "TASK12_ALL", "ALL");
        insertRole(self, "TASK12_SELF", "SELF");
        insertRole(own, "TASK12_OWN", "OWN_DEPT");
        insertRole(below, "TASK12_BELOW", "OWN_DEPT_AND_BELOW");
        insertRole(customRole, "TASK12_CUSTOM", "CUSTOM_DEPT");
        jdbc.update("insert into mb_role_custom_dept(role_id,dept_id) values (?,?) on conflict do nothing", customRole, custom);

        assignRoles(all);
        assertThat(compile().dataScope().all()).isTrue();
        assignRoles(self, customRole);
        assertThat(compile().dataScope().includeSelf()).isTrue();
        assertThat(compile().dataScope().deptIds()).containsExactly(custom);
        assignRoles(own);
        assertThat(compile().dataScope().deptIds()).containsExactly(root);
        assignRoles(below, customRole);
        assertThat(compile().dataScope().deptIds()).containsExactlyInAnyOrder(root, child, custom);
        QueryCountHolder.clear();
        var counted = new JdbcAuthorizationGraphRepository(new JdbcTemplate(
                ProxyDataSourceBuilder.create(dataSource).countQuery().build()));
        counted.loadAll(Set.of(ADMIN));
        assertThat(QueryCountHolder.getGrandTotal().getSelect()).isLessThanOrEqualTo(4);
        assignRoles(customRole);
        assertThat(compile().dataScope().deptIds()).containsExactly(custom);
        jdbc.update("delete from mb_user_role where user_id=?", ADMIN);
    }

    private void insertRole(UUID id, String code, String scope) {
        jdbc.update("insert into mb_role(id,code,name,data_scope_type) values (?,?,?,?) on conflict do nothing", id, code, code, scope);
    }

    private void assignRoles(UUID... roleIds) {
        jdbc.update("delete from mb_user_role where user_id=?", ADMIN);
        for (UUID roleId : roleIds) jdbc.update("insert into mb_user_role(user_id,role_id) values (?,?)", ADMIN, roleId);
    }

    private AuthorizationSnapshot compile() {
        return compiler.compile(graphs.load(ADMIN), Instant.now());
    }

    @org.springframework.web.bind.annotation.RestController
    static class AuthProbe {
        private final AuthenticationService authentication;
        AuthProbe(AuthenticationService authentication) { this.authentication = authentication; }
        @org.springframework.web.bind.annotation.PostMapping("/__task12/login")
        LoginResult login(@org.springframework.web.bind.annotation.RequestBody LoginRequest request) {
            return authentication.login(request.username(), request.password());
        }
    }
    record LoginRequest(String username, String password) {}
}
