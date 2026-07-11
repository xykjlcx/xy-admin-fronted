package com.metabuild.modules.admin.auth.persistence;

import com.metabuild.modules.admin.auth.application.CurrentUserRepository;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

public final class JdbcCurrentUserRepository implements CurrentUserRepository {
    private final JdbcTemplate jdbc;
    public JdbcCurrentUserRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    @Override public UserIdentity find(UUID userId) {
        var rows = jdbc.query("select id,display_name,username from mb_user where id=? and status='ACTIVE' and deleted_at is null",
                (rs, row) -> new UserIdentity(rs.getObject("id", UUID.class), rs.getString("display_name"), rs.getString("username")), userId);
        return rows.isEmpty() ? null : rows.getFirst();
    }
}
