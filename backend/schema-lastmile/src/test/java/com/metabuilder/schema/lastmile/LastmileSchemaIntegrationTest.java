package com.metabuilder.schema.lastmile;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.metabuilder.schema.platform.PlatformFlywayRunner;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.postgresql.ds.PGSimpleDataSource;
import org.testcontainers.containers.PostgreSQLContainer;

class LastmileSchemaIntegrationTest {

  private static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("metabuilder_lastmile")
          .withUsername("test")
          .withPassword("test");

  private static DataSource dataSource;

  @BeforeAll
  static void startPostgres() {
    POSTGRES.start();
    PGSimpleDataSource postgresDataSource = new PGSimpleDataSource();
    postgresDataSource.setURL(POSTGRES.getJdbcUrl());
    postgresDataSource.setUser(POSTGRES.getUsername());
    postgresDataSource.setPassword(POSTGRES.getPassword());
    dataSource = postgresDataSource;
  }

  @AfterAll
  static void stopPostgres() {
    POSTGRES.stop();
  }

  @Test
  void migratesPlatformBeforeLastmileOnAFreshDatabase() throws SQLException {
    PlatformFlywayRunner.migrate(dataSource);
    LastmileFlywayRunner.migrate(dataSource);

    assertTrue(tableExists("mb_schema_probe"));
    assertTrue(tableExists("biz_schema_probe"));
    assertTrue(tableExists("flyway_platform_history"));
    assertTrue(tableExists("flyway_lastmile_history"));
    assertFalse(tableExists("flyway_schema_history"));
  }

  @Test
  void repeatedValidateRemainsIndependentForBothOwners() {
    PlatformFlywayRunner.migrate(dataSource);
    LastmileFlywayRunner.migrate(dataSource);

    PlatformFlywayRunner.validate(dataSource);
    LastmileFlywayRunner.validate(dataSource);
    PlatformFlywayRunner.validate(dataSource);
    LastmileFlywayRunner.validate(dataSource);
  }

  @Test
  void rejectsDuplicateVersionsInsideAnIsolatedLastmileFixture() {
    Flyway duplicateFixture =
        Flyway.configure()
            .dataSource(dataSource)
            .locations("classpath:db/fixtures/duplicate-lastmile")
            .table("flyway_duplicate_lastmile_history")
            .load();

    FlywayException failure = assertThrows(FlywayException.class, duplicateFixture::migrate);
    assertTrue(failure.getMessage().contains("version 1"));
  }

  private static boolean tableExists(String tableName) throws SQLException {
    try (Connection connection = dataSource.getConnection();
        Statement statement = connection.createStatement();
        ResultSet result =
            statement.executeQuery("select to_regclass('public." + tableName + "') is not null")) {
      assertTrue(result.next());
      return result.getBoolean(1);
    }
  }
}
