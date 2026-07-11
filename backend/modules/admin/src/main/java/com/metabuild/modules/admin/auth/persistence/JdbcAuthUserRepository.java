package com.metabuild.modules.admin.auth.persistence;

import com.metabuild.modules.admin.auth.application.AuthUser;
import com.metabuild.modules.admin.auth.application.AuthUserRepository;
import org.springframework.jdbc.core.JdbcTemplate;

public final class JdbcAuthUserRepository implements AuthUserRepository {
    private final JdbcTemplate jdbc;
    public JdbcAuthUserRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override public AuthUser findByUsername(String username) {
        var rows = jdbc.query("""
                select id, username, password_hash, status, deleted_at
                from mb_user where lower(username) = lower(?)
                """, (rs, row) -> new AuthUser(rs.getObject("id", java.util.UUID.class),
                rs.getString("username"), rs.getString("password_hash"),
                "ACTIVE".equals(rs.getString("status")), rs.getObject("deleted_at") != null), username);
        return rows.isEmpty() ? null : rows.getFirst();
    }
}
