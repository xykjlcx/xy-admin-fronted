package com.metabuild.modules.admin.auth.persistence;

import com.metabuild.modules.admin.auth.application.BootstrapCredentialRepository;
import org.springframework.jdbc.core.JdbcTemplate;

public final class JdbcBootstrapCredentialRepository implements BootstrapCredentialRepository {
    private static final String ADMIN_ID = "01900000-0000-7000-8000-000000000010";
    private final JdbcTemplate jdbc;
    public JdbcBootstrapCredentialRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    @Override public boolean compareAndSet(String expectedHash, String replacementHash) {
        return jdbc.update("update mb_user set password_hash=?, updated_at=current_timestamp where id=?::uuid and password_hash=?",
                replacementHash, ADMIN_ID, expectedHash) == 1;
    }
}
