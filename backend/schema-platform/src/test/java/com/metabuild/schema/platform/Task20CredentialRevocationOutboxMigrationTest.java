package com.metabuild.schema.platform;

import static org.junit.jupiter.api.Assertions.*;
import java.nio.file.*;
import org.junit.jupiter.api.Test;

class Task20CredentialRevocationOutboxMigrationTest {
    @Test void credentialsChangedUsesDedicatedDurableOutbox() throws Exception {
        String sql = Files.readString(Path.of("src/main/resources/db/migration/platform/V12__credential_revocation_outbox.sql"));
        assertTrue(sql.contains("mb_credential_revocation_outbox"));
        assertTrue(sql.contains("CREDENTIALS_CHANGED"));
        assertFalse(sql.contains("mb_authz_refresh_outbox"));
    }

    @Test void credentialWorkerHasLeaseReclaimAndAbaGuards() throws Exception {
        String sql = Files.readString(Path.of("src/main/resources/db/migration/platform/V13__credential_revocation_worker_lease.sql"));
        assertTrue(sql.contains("protected_session_id"));
        assertTrue(sql.contains("worker_id"));
        assertTrue(sql.contains("claimed_at"));
        assertTrue(sql.contains("lease_until"));
        assertTrue(sql.contains("status = 'FAILED'"));
        assertTrue(sql.contains("status = 'PROCESSING'"));
        assertTrue(sql.contains("mb_credential_revocation_reclaim_idx"));
    }
}
