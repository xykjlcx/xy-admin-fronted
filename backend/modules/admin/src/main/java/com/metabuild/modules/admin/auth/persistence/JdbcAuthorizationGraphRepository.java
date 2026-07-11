package com.metabuild.modules.admin.auth.persistence;

import com.metabuild.modules.admin.auth.application.AuthorizationGrant;
import com.metabuild.modules.admin.auth.application.AuthorizationGraph;
import com.metabuild.modules.admin.auth.application.AuthorizationGraphRepository;
import com.metabuild.modules.admin.auth.application.ScopeType;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

public final class JdbcAuthorizationGraphRepository implements AuthorizationGraphRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public JdbcAuthorizationGraphRepository(JdbcTemplate jdbc) { this.jdbc = new NamedParameterJdbcTemplate(jdbc); }

    @Override public Map<UUID, AuthorizationGraph> loadAll(Set<UUID> userIds) {
        if (userIds.isEmpty()) return Map.of();
        var parameters = new MapSqlParameterSource("userIds", userIds);
        var users = new LinkedHashMap<UUID, UserBuilder>();
        jdbc.query("""
                select id,authz_revision,dept_id from mb_user
                where id in (:userIds) and status='ACTIVE' and deleted_at is null
                """, parameters, (RowCallbackHandler) rs -> users.put(rs.getObject("id", UUID.class), new UserBuilder(
                rs.getLong("authz_revision"), rs.getObject("dept_id", UUID.class))));

        jdbc.query("""
                select ur.user_id,r.id role_id,r.code,r.grants_system_admin,r.data_scope_type,p.code permission_code
                from mb_user_role ur
                join mb_role r on r.id=ur.role_id and r.status='ACTIVE' and r.deleted_at is null
                left join mb_role_permission rp on rp.role_id=r.id
                left join mb_permission p on p.id=rp.permission_id and p.status='ACTIVE' and p.deleted_at is null
                where ur.user_id in (:userIds) order by ur.user_id,r.id
                """, parameters, (RowCallbackHandler) rs -> {
            var user = users.get(rs.getObject("user_id", UUID.class));
            if (user == null) return;
            UUID roleId = rs.getObject("role_id", UUID.class);
            String roleCode = rs.getString("code");
            boolean systemAdmin = rs.getBoolean("grants_system_admin");
            ScopeType scope = ScopeType.valueOf(rs.getString("data_scope_type"));
            var role = user.roles.computeIfAbsent(roleId, ignored -> new GrantBuilder(
                    roleCode, systemAdmin, scope));
            String permission = rs.getString("permission_code");
            if (permission != null) role.permissions.add(permission);
        });

        Set<UUID> roleIds = new HashSet<>();
        users.values().forEach(user -> roleIds.addAll(user.roles.keySet()));
        if (!roleIds.isEmpty()) jdbc.query("""
                select rcd.role_id,d.id dept_id from mb_role_custom_dept rcd
                join mb_dept d on d.id=rcd.dept_id and d.status='ACTIVE' and d.deleted_at is null
                where rcd.role_id in (:roleIds)
                """, new MapSqlParameterSource("roleIds", roleIds), (RowCallbackHandler) rs -> {
            UUID roleId = rs.getObject("role_id", UUID.class);
            UUID deptId = rs.getObject("dept_id", UUID.class);
            users.values().forEach(user -> {
                var role = user.roles.get(roleId);
                if (role != null && role.scope == ScopeType.CUSTOM_DEPT) role.depts.add(deptId);
            });
        });

        Set<UUID> roots = new HashSet<>();
        users.values().stream().filter(UserBuilder::needsSubtree).map(user -> user.deptId).forEach(roots::add);
        var subtrees = new LinkedHashMap<UUID, Set<UUID>>();
        if (!roots.isEmpty()) jdbc.query("""
                with recursive subtree(root_id,id) as (
                  select id,id from mb_dept where id in (:roots) and status='ACTIVE' and deleted_at is null
                  union all select s.root_id,d.id from mb_dept d join subtree s on d.parent_id=s.id
                  where d.status='ACTIVE' and d.deleted_at is null
                ) select root_id,id from subtree
                """, new MapSqlParameterSource("roots", roots), (RowCallbackHandler) rs -> subtrees
                .computeIfAbsent(rs.getObject("root_id", UUID.class), ignored -> new HashSet<>())
                .add(rs.getObject("id", UUID.class)));

        var result = new LinkedHashMap<UUID, AuthorizationGraph>();
        users.forEach((userId, user) -> {
            user.roles.values().stream().filter(role -> role.scope == ScopeType.OWN_DEPT_AND_BELOW)
                    .forEach(role -> role.depts.addAll(subtrees.getOrDefault(user.deptId, Set.of())));
            var grants = new ArrayList<AuthorizationGrant>();
            user.roles.values().forEach(role -> grants.add(new AuthorizationGrant(
                    role.code, role.systemAdmin, role.scope, role.depts, role.permissions)));
            result.put(userId, new AuthorizationGraph(userId, user.revision, user.deptId, grants));
        });
        return Map.copyOf(result);
    }

    private static final class UserBuilder {
        private final long revision; private final UUID deptId;
        private final LinkedHashMap<UUID, GrantBuilder> roles = new LinkedHashMap<>();
        private UserBuilder(long revision, UUID deptId) { this.revision=revision; this.deptId=deptId; }
        private boolean needsSubtree() { return deptId != null && roles.values().stream().anyMatch(role -> role.scope == ScopeType.OWN_DEPT_AND_BELOW); }
    }
    private static final class GrantBuilder {
        private final String code; private final boolean systemAdmin; private final ScopeType scope;
        private final HashSet<UUID> depts = new HashSet<>(); private final HashSet<String> permissions = new HashSet<>();
        private GrantBuilder(String code, boolean systemAdmin, ScopeType scope) { this.code=code; this.systemAdmin=systemAdmin; this.scope=scope; }
    }
}
