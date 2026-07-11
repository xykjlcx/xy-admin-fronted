package com.metabuild.schema.platform;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;

class PlatformIamMigrationContractTest {

  private static final List<String> IAM_TABLES =
      List.of(
          "mb_user",
          "mb_dept",
          "mb_role",
          "mb_role_custom_dept",
          "mb_user_role",
          "mb_permission",
          "mb_role_permission",
          "mb_menu",
          "mb_menu_customization",
          "mb_refresh_token",
          "mb_authz_refresh_outbox",
          "mb_login_log",
          "mb_operation_log");

  @Test
  void definesTheCompletePlatformOwnedIamReadModel() throws IOException {
    String migration = iamMigration();

    for (String table : IAM_TABLES) {
      assertTrue(migration.contains("create table " + table + " ("), "missing " + table);
    }
    assertFalse(migration.contains("default gen_random_uuid()"));
    assertFalse(migration.contains("default uuid_generate_v4()"));
    assertTrue(migration.contains("data_scope_type in ('ALL', 'SELF', 'OWN_DEPT', 'OWN_DEPT_AND_BELOW', 'CUSTOM_DEPT')"));
    assertTrue(migration.contains("authz_revision >= 0"));
    assertTrue(migration.contains("mb_user_authz_revision_monotonic"));
    assertTrue(migration.contains("mb_dept_reject_cycle"));
    assertTrue(migration.contains("mb_role_custom_dept_guard"));
    assertTrue(migration.contains("pg_advisory_xact_lock(hashtextextended('METABUILDER_DEPT_TOPOLOGY', 0))"));
    assertTrue(migration.contains("for update"));
    assertTrue(migration.contains("lease_until timestamp with time zone"));
    assertTrue(migration.contains("worker_id varchar(128)"));
    assertTrue(migration.contains("mb_authz_refresh_outbox_reclaim_idx"));
    assertTrue(migration.contains("grants_system_admin boolean"));
    assertTrue(migration.contains("mb_role_single_system_admin_uq"));
  }

  @Test
  void stableKeysUsePartialUniqueIndexesAndBootstrapCatalogGrammar() throws IOException {
    String migration = iamMigration();

    assertTrue(migration.contains("mb_user_username_active_uq"));
    assertTrue(migration.contains("mb_role_code_active_uq"));
    assertTrue(migration.contains("mb_permission_code_active_uq"));
    assertTrue(migration.contains("mb_permission_source_key_active_uq"));
    assertTrue(migration.contains("mb_menu_source_key_active_uq"));
    assertTrue(migration.contains("where deleted_at is null"));
    assertTrue(migration.contains("code ~ '^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$'"));
    assertTrue(migration.contains("/_auth/admin/dashboard#page"));
    assertTrue(migration.contains("/_auth/admin/users#page"));
    assertTrue(migration.contains("/_auth/admin/roles#page"));
    assertTrue(migration.contains("/_auth/admin/menus#page"));
    assertTrue(
        migration.contains("'!bootstrap-credential-unset!'"),
        "tracked migrations must not embed a usable bootstrap credential");
  }

  @Test
  void fixturesCoverRequiredMultiRoleScopeCombinations() throws IOException {
    String migration = Files.readString(
        Path.of("src/test/resources/db/fixtures/iam-scope-combinations.sql"));

    assertTrue(migration.contains("bootstrap-scope-self-custom"));
    assertTrue(migration.contains("bootstrap-scope-own-below-custom"));
  }

  private static String iamMigration() throws IOException {
    Path migration =
        Path.of("src/main/resources/db/migration/platform/V2__create_iam_read_model.sql");
    assertTrue(Files.isRegularFile(migration), "IAM migration must exist");
    return Files.readString(migration);
  }
}
