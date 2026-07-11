package com.metabuild.schema.platform;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeFalse;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.flywaydb.core.api.exception.FlywayValidateException;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.postgresql.ds.PGSimpleDataSource;
import org.testcontainers.containers.PostgreSQLContainer;

class PlatformSchemaIntegrationTest {

  private static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("metabuilder_platform")
          .withUsername("test")
          .withPassword("test");

  private static DataSource dataSource;

  @BeforeAll
  static void startPostgres() {
    String localUrl = System.getProperty("metabuilder.test.jdbc-url");
    if (localUrl != null) {
      PGSimpleDataSource postgresDataSource = new PGSimpleDataSource();
      postgresDataSource.setURL(localUrl);
      postgresDataSource.setUser(System.getProperty("metabuilder.test.jdbc-user", "test"));
      postgresDataSource.setPassword(System.getProperty("metabuilder.test.jdbc-password", "test"));
      dataSource = postgresDataSource;
      return;
    }
    POSTGRES.start();
    PGSimpleDataSource postgresDataSource = new PGSimpleDataSource();
    postgresDataSource.setURL(POSTGRES.getJdbcUrl());
    postgresDataSource.setUser(POSTGRES.getUsername());
    postgresDataSource.setPassword(POSTGRES.getPassword());
    dataSource = postgresDataSource;
  }

  @AfterAll
  static void stopPostgres() {
    if (POSTGRES.isRunning()) {
      POSTGRES.stop();
    }
  }

  @Test
  void migratesPlatformOnlyOnAFreshDatabaseWithOwnedHistory() throws SQLException {
    PlatformFlywayRunner.migrate(dataSource);

    assertTrue(tableExists("mb_schema_probe"));
    assertTrue(tableExists("flyway_platform_history"));
    assertFalse(tableExists("flyway_lastmile_history"));
    assertFalse(tableExists("flyway_schema_history"));
    assertTrue(tableExists("mb_user"));
    assertTrue(tableExists("mb_role"));
    assertTrue(tableExists("mb_permission"));
    assertTrue(tableExists("mb_menu"));
    assertEquals(1, count("select count(*) from mb_user where username = 'admin'"));
    assertEquals(
        4,
        count(
            "select count(*) from mb_permission where first_seen_version = 'p1-bootstrap'"));
  }

  @Test
  void upgradesARealVersionOneDatabaseWithoutTouchingLastmileHistory() throws SQLException {
    assumeFalse(
        System.getProperty("metabuilder.test.jdbc-url") != null,
        "upgrade path uses its own Testcontainers database; local fallback is covered manually");
    try (PostgreSQLContainer<?> upgradePostgres =
        new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("metabuilder_platform_upgrade")
            .withUsername("test")
            .withPassword("test")) {
      upgradePostgres.start();
      PGSimpleDataSource upgradeDataSource = new PGSimpleDataSource();
      upgradeDataSource.setURL(upgradePostgres.getJdbcUrl());
      upgradeDataSource.setUser(upgradePostgres.getUsername());
      upgradeDataSource.setPassword(upgradePostgres.getPassword());

      Flyway.configure()
          .dataSource(upgradeDataSource)
          .locations(PlatformFlywayRunner.LOCATION)
          .table(PlatformFlywayRunner.HISTORY_TABLE)
          .target("1")
          .load()
          .migrate();
      assertTrue(tableExists(upgradeDataSource, "mb_schema_probe"));
      assertFalse(tableExists(upgradeDataSource, "mb_user"));

      PlatformFlywayRunner.migrate(upgradeDataSource);
      PlatformFlywayRunner.validate(upgradeDataSource);
      assertTrue(tableExists(upgradeDataSource, "mb_user"));
      assertTrue(tableExists(upgradeDataSource, "flyway_platform_history"));
      assertFalse(tableExists(upgradeDataSource, "flyway_lastmile_history"));
    }
  }

  @Test
  void enforcesDepartmentCyclesScopeRelationsAndMonotonicRevision() throws SQLException {
    PlatformFlywayRunner.migrate(dataSource);
    String prefix = UUID.randomUUID().toString().substring(0, 8);
    String root = "01900000-0001-7000-8000-" + prefix + "0001";
    String child = "01900000-0001-7000-8000-" + prefix + "0002";
    String grandchild = "01900000-0001-7000-8000-" + prefix + "0003";
    String user = "01900000-0001-7000-8000-" + prefix + "0010";
    String role = "01900000-0001-7000-8000-" + prefix + "0020";

    execute("insert into mb_dept(id, code, name) values ('" + root + "', '" + prefix + "-root', 'root')");
    execute("insert into mb_dept(id, parent_id, code, name) values ('" + child + "', '" + root + "', '" + prefix + "-child', 'child')");
    execute("insert into mb_dept(id, parent_id, code, name) values ('" + grandchild + "', '" + child + "', '" + prefix + "-grandchild', 'grandchild')");
    assertSqlState("23514", "update mb_dept set parent_id = '" + grandchild + "' where id = '" + root + "'");
    assertSqlState("23514", "update mb_dept set parent_id = id where id = '" + root + "'");

    execute("insert into mb_user(id, dept_id, username, password_hash, display_name) values ('" + user + "', '" + child + "', '" + prefix + "', 'hash', 'fixture')");
    execute("update mb_user set authz_revision = 2 where id = '" + user + "'");
    assertSqlState("23514", "update mb_user set authz_revision = 1 where id = '" + user + "'");

    execute("insert into mb_role(id, code, name, data_scope_type) values ('" + role + "', '" + prefix + "', 'fixture', 'SELF')");
    assertSqlState("23514", "insert into mb_role_custom_dept(role_id, dept_id) values ('" + role + "', '" + child + "')");
    execute("update mb_role set data_scope_type = 'CUSTOM_DEPT' where id = '" + role + "'");
    execute("insert into mb_role_custom_dept(role_id, dept_id) values ('" + role + "', '" + child + "')");
    execute("update mb_role set data_scope_type = 'OWN_DEPT' where id = '" + role + "'");
    assertEquals(0, count("select count(*) from mb_role_custom_dept where role_id = '" + role + "'"));
    String secondRole = "01900000-0001-7000-8000-" + prefix + "0021";
    execute("insert into mb_role(id,code,name,data_scope_type) values ('" + secondRole + "','" + prefix + "-custom-two','fixture','CUSTOM_DEPT')");
    execute("update mb_dept set status='DISABLED' where id='" + grandchild + "'");
    assertSqlState(
        "23514",
        "insert into mb_role_custom_dept(role_id,dept_id) values ('"
            + secondRole
            + "','"
            + grandchild
            + "')");
  }

  @Test
  void enforcesForeignKeysChecksAndSoftDeleteAwareStableKeys() throws SQLException {
    PlatformFlywayRunner.migrate(dataSource);
    String prefix = UUID.randomUUID().toString().substring(0, 8);
    String dept = "01900000-0003-7000-8000-" + prefix + "0001";
    String firstUser = "01900000-0003-7000-8000-" + prefix + "0010";
    String secondUser = "01900000-0003-7000-8000-" + prefix + "0011";

    execute(
        "insert into mb_dept(id, code, name) values ('"
            + dept
            + "', '"
            + prefix
            + "-unique', 'unique')");
    execute(
        "insert into mb_user(id, dept_id, username, password_hash, display_name) values ('"
            + firstUser
            + "', '"
            + dept
            + "', '"
            + prefix
            + "-user', 'hash', 'first')");
    assertSqlState(
        "23505",
        "insert into mb_user(id, username, password_hash, display_name) values ('"
            + secondUser
            + "', '"
            + prefix
            + "-user', 'hash', 'duplicate')");
    execute("update mb_user set deleted_at = current_timestamp where id = '" + firstUser + "'");
    execute(
        "insert into mb_user(id, username, password_hash, display_name) values ('"
            + secondUser
            + "', '"
            + prefix
            + "-user', 'hash', 'replacement')");

    assertSqlState(
        "23503",
        "insert into mb_user_role(user_id, role_id) values ('"
            + secondUser
            + "', '01900000-0003-7000-8000-ffffffffffff')");
    assertSqlState(
        "23514",
        "insert into mb_role(id, code, name, data_scope_type) values "
            + "('01900000-0003-7000-8000-"
            + prefix
            + "0020', '"
            + prefix
            + "-bad-scope', 'bad', 'OWN_CHILD')");
    assertSqlState(
        "23514",
        "insert into mb_permission(id, source_key, code, kind, first_seen_version, last_seen_version) values "
            + "('01900000-0003-7000-8000-"
            + prefix
            + "0030', '/fixture#page', 'legacy:view', 'PAGE', 'test', 'test')");
  }

  @Test
  void fixturesRepresentBothRequiredMultiRoleScopeUnions() throws Exception {
    PlatformFlywayRunner.migrate(dataSource);
    String fixture = new String(
        PlatformSchemaIntegrationTest.class.getResourceAsStream(
                "/db/fixtures/iam-scope-combinations.sql")
            .readAllBytes());
    execute(fixture);
    assertEquals(
        2,
        count("select count(*) from mb_role where code in ('FIXTURE_SELF', 'FIXTURE_CUSTOM_ONE')"));
    assertEquals(
        2,
        count("select count(*) from mb_role where code in ('FIXTURE_OWN_BELOW', 'FIXTURE_CUSTOM_TWO')"));
    assertEquals(
        2,
        count(
            "select count(*) from mb_user_role where user_id = "
                + "'01900000-0000-7000-8000-00000000f020'"));
    assertEquals(
        2,
        count(
            "select count(*) from mb_user_role where user_id = "
                + "'01900000-0000-7000-8000-00000000f021'"));
  }

  @Test
  void serializesConcurrentDepartmentWritesSoOnlyOneSideOfACycleCommits() throws Exception {
    PlatformFlywayRunner.migrate(dataSource);
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    String left = "01900000-0004-7000-8000-" + suffix + "0001";
    String right = "01900000-0004-7000-8000-" + suffix + "0002";
    execute("insert into mb_dept(id,code,name) values ('" + left + "','" + suffix + "-l','l'),('" + right + "','" + suffix + "-r','r')");

    try (Connection first = dataSource.getConnection();
        Connection second = dataSource.getConnection();
        var executor = Executors.newSingleThreadExecutor()) {
      first.setAutoCommit(false);
      second.setAutoCommit(false);
      first.createStatement().executeUpdate("update mb_dept set parent_id='" + right + "' where id='" + left + "'");
      CountDownLatch barrier = new CountDownLatch(1);
      Future<String> competing =
          executor.submit(
              () -> {
                barrier.countDown();
                try {
                  second.createStatement().executeUpdate(
                      "update mb_dept set parent_id='" + left + "' where id='" + right + "'");
                  second.commit();
                  return "committed";
                } catch (SQLException failure) {
                  second.rollback();
                  return failure.getSQLState();
                }
              });
      assertTrue(barrier.await(1, TimeUnit.SECONDS));
      assertThrows(TimeoutException.class, () -> competing.get(150, TimeUnit.MILLISECONDS));
      first.commit();
      assertEquals("23514", competing.get());
    }
    assertEquals(1, count("select count(*) from mb_dept where parent_id is not null and id in ('" + left + "','" + right + "')"));
  }

  @Test
  void serializesCustomRelationInsertAgainstRoleInvalidation() throws Exception {
    PlatformFlywayRunner.migrate(dataSource);
    for (String invalidation : List.of(
        "status='DISABLED'", "data_scope_type='SELF'", "deleted_at=current_timestamp")) {
      String suffix = UUID.randomUUID().toString().substring(0, 8);
      String dept = "01900000-0005-7000-8000-" + suffix + "0001";
      String role = "01900000-0005-7000-8000-" + suffix + "0002";
      execute("insert into mb_dept(id,code,name) values ('" + dept + "','" + suffix + "-d','d')");
      execute("insert into mb_role(id,code,name,data_scope_type) values ('" + role + "','" + suffix + "-r','r','CUSTOM_DEPT')");
      try (Connection insert = dataSource.getConnection();
          Connection update = dataSource.getConnection();
          var executor = Executors.newSingleThreadExecutor()) {
        insert.setAutoCommit(false);
        update.setAutoCommit(false);
        insert.createStatement().executeUpdate(
            "insert into mb_role_custom_dept(role_id,dept_id) values ('" + role + "','" + dept + "')");
        CountDownLatch barrier = new CountDownLatch(1);
        Future<Integer> invalidating =
            executor.submit(
                () -> {
                  barrier.countDown();
                  int changed = update.createStatement().executeUpdate(
                      "update mb_role set " + invalidation + " where id='" + role + "'");
                  update.commit();
                  return changed;
                });
        assertTrue(barrier.await(1, TimeUnit.SECONDS));
        assertThrows(TimeoutException.class, () -> invalidating.get(150, TimeUnit.MILLISECONDS));
        insert.commit();
        assertEquals(1, invalidating.get());
      }
      assertEquals(0, count("select count(*) from mb_role_custom_dept where role_id='" + role + "'"));
    }
  }

  @Test
  void allowsOnlyOneWorkerToReclaimAnExpiredOutboxLease() throws Exception {
    PlatformFlywayRunner.migrate(dataSource);
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    String outbox = "01900000-0006-7000-8000-" + suffix + "0001";
    execute(
        "insert into mb_authz_refresh_outbox(id,operation_id,user_id,target_revision,event_type,status,worker_id,claimed_at,lease_until) values ('"
            + outbox
            + "','01900000-0006-7000-8000-"
            + suffix
            + "0002','01900000-0000-7000-8000-000000000010',1,'REFRESH','PROCESSING','dead-worker',current_timestamp-interval '2 minutes',current_timestamp-interval '1 minute')");
    String claimSql =
        "update mb_authz_refresh_outbox set worker_id=?,claimed_at=current_timestamp,lease_until=current_timestamp+interval '1 minute' "
            + "where id=?::uuid and status='PROCESSING' and lease_until < current_timestamp";
    try (Connection first = dataSource.getConnection(); Connection second = dataSource.getConnection()) {
      var one = first.prepareStatement(claimSql);
      one.setString(1, "worker-one");
      one.setString(2, outbox);
      assertEquals(1, one.executeUpdate());
      var two = second.prepareStatement(claimSql);
      two.setString(1, "worker-two");
      two.setString(2, outbox);
      assertEquals(0, two.executeUpdate());
    }
    assertEquals(1, count("select count(*) from mb_authz_refresh_outbox where id='" + outbox + "' and worker_id='worker-one'"));
  }

  @Test
  void rejectsAStaleRevisionWriterAfterTheHigherRevisionCommits() throws Exception {
    PlatformFlywayRunner.migrate(dataSource);
    String userId = "01900000-0000-7000-8000-000000000010";
    try (Connection higher = dataSource.getConnection();
        Connection stale = dataSource.getConnection();
        var executor = Executors.newSingleThreadExecutor()) {
      higher.setAutoCommit(false);
      stale.setAutoCommit(false);
      higher.createStatement().executeUpdate(
          "update mb_user set authz_revision=authz_revision+2 where id='" + userId + "'");
      CountDownLatch barrier = new CountDownLatch(1);
      Future<String> staleResult =
          executor.submit(
              () -> {
                barrier.countDown();
                try {
                  stale.createStatement().executeUpdate(
                      "update mb_user set authz_revision=0 where id='" + userId + "'");
                  stale.commit();
                  return "committed";
                } catch (SQLException failure) {
                  stale.rollback();
                  return failure.getSQLState();
                }
              });
      assertTrue(barrier.await(1, TimeUnit.SECONDS));
      higher.commit();
      assertEquals("23514", staleResult.get());
    }
  }

  @Test
  void enforcesMenuRefreshOutboxAndSystemAdministratorShapes() throws SQLException {
    PlatformFlywayRunner.migrate(dataSource);
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    assertEquals(1, count("select count(*) from mb_role where grants_system_admin and status='ACTIVE' and deleted_at is null"));
    assertSqlState(
        "23514",
        "insert into mb_role(id,code,name,system_role,grants_system_admin,data_scope_type) values "
            + "('01900000-0007-7000-8000-"
            + suffix
            + "0001','"
            + suffix
            + "-bad-admin','bad',false,true,'ALL')");
    assertSqlState(
        "23505",
        "insert into mb_role(id,code,name,system_role,grants_system_admin,data_scope_type) values "
            + "('01900000-0007-7000-8000-"
            + suffix
            + "0002','"
            + suffix
            + "-second-admin','second',true,true,'ALL')");
    assertSqlState(
        "23514",
        "insert into mb_menu(id,source_key,origin,subsystem_key,default_label_key) values "
            + "('01900000-0007-7000-8000-"
            + suffix
            + "0010','/runtime#page','RUNTIME','admin','runtime')");
    assertSqlState(
        "23514",
        "insert into mb_menu_customization(menu_id,parent_overridden,parent_id) values "
            + "('01900000-0000-7000-8000-000000000201',true,'01900000-0000-7000-8000-000000000201')");
    assertSqlState(
        "23514",
        "insert into mb_refresh_token(id,user_id,family_id,token_hash,expires_at) values "
            + "('01900000-0007-7000-8000-"
            + suffix
            + "0020','01900000-0000-7000-8000-000000000010','01900000-0007-7000-8000-"
            + suffix
            + "0021','"
            + suffix
            + "',current_timestamp-interval '1 minute')");
    assertSqlState(
        "23514",
        "insert into mb_authz_refresh_outbox(id,operation_id,user_id,target_revision,event_type,status) values "
            + "('01900000-0007-7000-8000-"
            + suffix
            + "0030','01900000-0007-7000-8000-"
            + suffix
            + "0031','01900000-0000-7000-8000-000000000010',1,'REFRESH','PROCESSING')");
  }

  @Test
  void exposesTheCompleteConstraintAndIndexMetadata() throws SQLException {
    PlatformFlywayRunner.migrate(dataSource);
    for (String constraint : List.of(
        "mb_dept_not_self_parent",
        "mb_role_data_scope_type_check",
        "mb_role_system_admin_shape_check",
        "mb_permission_code_grammar",
        "mb_permission_source_key_grammar",
        "mb_menu_origin_shape_check",
        "mb_menu_customization_not_self_parent",
        "mb_refresh_token_expiry_check",
        "mb_authz_refresh_outbox_claim_shape_check")) {
      assertEquals(
          1,
          count(
              "select count(*) from pg_constraint where conname='" + constraint + "'"));
    }
    for (String index : List.of(
        "mb_user_username_active_uq",
        "mb_role_code_active_uq",
        "mb_role_single_system_admin_uq",
        "mb_permission_code_active_uq",
        "mb_permission_source_key_active_uq",
        "mb_menu_source_key_active_uq",
        "mb_authz_refresh_outbox_pending_idx",
        "mb_authz_refresh_outbox_reclaim_idx")) {
      assertEquals(
          1,
          count(
              "select count(*) from pg_indexes where schemaname='public' and indexname='"
                  + index
                  + "' and indexdef like '%WHERE%'"));
    }
    assertTrue(
        count(
                "select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid "
                    + "where c.contype='f' and t.relname like 'mb_%'")
            >= 16);
    assertTrue(
        count(
                "select count(*) from pg_constraint where contype='f' "
                    + "and pg_get_constraintdef(oid) like '%ON DELETE CASCADE%'")
            >= 6);
    assertTrue(
        count(
                "select count(*) from pg_constraint where contype='f' "
                    + "and pg_get_constraintdef(oid) like '%ON DELETE RESTRICT%'")
            >= 3);
  }

  @Test
  void enforcesStableKeyEnumOutboxAndDeleteActionBehaviorMatrix() throws SQLException {
    PlatformFlywayRunner.migrate(dataSource);
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    String permissionOne = "01900000-0008-7000-8000-" + suffix + "0001";
    String permissionTwo = "01900000-0008-7000-8000-" + suffix + "0002";
    String source = "/fixture/" + suffix + "#page";
    String code = "fixture:r" + suffix + ":view";
    execute(
        "insert into mb_permission(id,source_key,code,kind,first_seen_version,last_seen_version) values ('"
            + permissionOne
            + "','"
            + source
            + "','"
            + code
            + "','PAGE','test','test')");
    assertSqlState(
        "23505",
        "insert into mb_permission(id,source_key,code,kind,first_seen_version,last_seen_version) values ('"
            + permissionTwo
            + "','/fixture/other-"
            + suffix
            + "#page','"
            + code
            + "','PAGE','test','test')");
    execute("update mb_permission set deleted_at=current_timestamp where id='" + permissionOne + "'");
    execute(
        "insert into mb_permission(id,source_key,code,kind,first_seen_version,last_seen_version) values ('"
            + permissionTwo
            + "','"
            + source
            + "','"
            + code
            + "','PAGE','test','test')");
    assertSqlState(
        "23514",
        "update mb_permission set kind='UNKNOWN' where id='" + permissionTwo + "'");
    assertSqlState(
        "23514",
        "update mb_permission set status='DISABLED' where id='" + permissionTwo + "'");
    assertSqlState(
        "23514",
        "update mb_menu set status='DISABLED' where id='01900000-0000-7000-8000-000000000201'");
    assertSqlState(
        "23514",
        "insert into mb_menu(id,origin,subsystem_key,default_label_key) values "
            + "('01900000-0008-7000-8000-"
            + suffix
            + "0010','CATALOG','admin','missing-source')");
    String outboxBase =
        "','01900000-0008-7000-8000-"
            + suffix
            + "0099','01900000-0000-7000-8000-000000000010',1,";
    assertSqlState(
        "23514",
        "insert into mb_authz_refresh_outbox(id,operation_id,user_id,target_revision,event_type,status,attempts) values ('01900000-0008-7000-8000-"
            + suffix
            + "0020"
            + outboxBase
            + "'UNKNOWN','PENDING',0)");
    assertSqlState(
        "23514",
        "insert into mb_authz_refresh_outbox(id,operation_id,user_id,target_revision,event_type,status,attempts) values ('01900000-0008-7000-8000-"
            + suffix
            + "0021"
            + outboxBase
            + "'REFRESH','UNKNOWN',0)");
    assertSqlState(
        "23514",
        "insert into mb_authz_refresh_outbox(id,operation_id,user_id,target_revision,event_type,status,attempts) values ('01900000-0008-7000-8000-"
            + suffix
            + "0022"
            + outboxBase
            + "'REFRESH','PENDING',-1)");
    execute(
        "insert into mb_authz_refresh_outbox(id,operation_id,user_id,target_revision,event_type) values "
            + "('01900000-0008-7000-8000-"
            + suffix
            + "0030','01900000-0008-7000-8000-"
            + suffix
            + "0031','01900000-0000-7000-8000-000000000010',1,'REFRESH')");
    assertSqlState(
        "23505",
        "insert into mb_authz_refresh_outbox(id,operation_id,user_id,target_revision,event_type) values "
            + "('01900000-0008-7000-8000-"
            + suffix
            + "0032','01900000-0008-7000-8000-"
            + suffix
            + "0031','01900000-0000-7000-8000-000000000010',2,'REFRESH')");
    String dept = "01900000-0008-7000-8000-" + suffix + "0040";
    String role = "01900000-0008-7000-8000-" + suffix + "0041";
    execute("insert into mb_dept(id,code,name) values ('" + dept + "','" + suffix + "-restrict','restrict')");
    execute("insert into mb_role(id,code,name,data_scope_type) values ('" + role + "','" + suffix + "-cascade','cascade','SELF')");
    execute("insert into mb_user_role(user_id,role_id) values ('01900000-0000-7000-8000-000000000010','" + role + "')");
    execute("delete from mb_role where id='" + role + "'");
    assertEquals(0, count("select count(*) from mb_user_role where role_id='" + role + "'"));
    execute("update mb_user set dept_id='" + dept + "' where id='01900000-0000-7000-8000-000000000010'");
    assertSqlState("23503", "delete from mb_dept where id='" + dept + "'");
  }

  @Test
  void repeatedPlatformValidateIsIdempotent() {
    PlatformFlywayRunner.migrate(dataSource);

    PlatformFlywayRunner.validate(dataSource);
    PlatformFlywayRunner.validate(dataSource);
  }

  @Test
  void rejectsCorruptedPlatformMigrationChecksum() throws SQLException {
    PlatformFlywayRunner.migrate(dataSource);
    int originalChecksum = migrationChecksum("flyway_platform_history");

    try {
      overwriteMigrationChecksum("flyway_platform_history", originalChecksum ^ 1);
      assertThrows(
          FlywayValidateException.class, () -> PlatformFlywayRunner.validate(dataSource));
    } finally {
      overwriteMigrationChecksum("flyway_platform_history", originalChecksum);
    }
  }

  @Test
  void rejectsDuplicateVersionsInsideAnIsolatedPlatformFixture() {
    Flyway duplicateFixture =
        Flyway.configure()
            .dataSource(dataSource)
            .locations("classpath:db/fixtures/duplicate-platform")
            .table("flyway_duplicate_platform_history")
            .load();

    FlywayException failure = assertThrows(FlywayException.class, duplicateFixture::migrate);
    assertTrue(failure.getMessage().contains("version 1"));
  }

  private static boolean tableExists(String tableName) throws SQLException {
    return tableExists(dataSource, tableName);
  }

  private static boolean tableExists(DataSource source, String tableName) throws SQLException {
    try (Connection connection = source.getConnection();
        Statement statement = connection.createStatement();
        ResultSet result =
            statement.executeQuery("select to_regclass('public." + tableName + "') is not null")) {
      assertTrue(result.next());
      return result.getBoolean(1);
    }
  }

  private static void execute(String sql) throws SQLException {
    try (Connection connection = dataSource.getConnection();
        Statement statement = connection.createStatement()) {
      statement.execute(sql);
    }
  }

  private static int count(String sql) throws SQLException {
    try (Connection connection = dataSource.getConnection();
        Statement statement = connection.createStatement();
        ResultSet result = statement.executeQuery(sql)) {
      assertTrue(result.next());
      return result.getInt(1);
    }
  }

  private static void assertSqlState(String expected, String sql) {
    SQLException failure = assertThrows(SQLException.class, () -> execute(sql));
    assertEquals(expected, failure.getSQLState());
  }

  private static int migrationChecksum(String historyTable) throws SQLException {
    try (Connection connection = dataSource.getConnection();
        Statement statement = connection.createStatement();
        ResultSet result =
            statement.executeQuery(
                "select checksum from " + historyTable + " where version = '1'")) {
      assertTrue(result.next());
      return result.getInt(1);
    }
  }

  private static void overwriteMigrationChecksum(String historyTable, int checksum)
      throws SQLException {
    try (Connection connection = dataSource.getConnection();
        Statement statement = connection.createStatement()) {
      assertEquals(
          1,
          statement.executeUpdate(
              "update " + historyTable + " set checksum = " + checksum + " where version = '1'"));
    }
  }
}
