package com.metabuild.app;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.DriverManager;
import java.util.ArrayList;
import java.util.Map;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.testcontainers.containers.PostgreSQLContainer;

class ApplicationDatabaseMigrationIntegrationTest {

  private static final String VALID_SECRET = "0123456789abcdef0123456789abcdef";
  private static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine");

  @BeforeAll
  static void startPostgres() {
    POSTGRES.start();
  }

  @AfterAll
  static void stopPostgres() {
    POSTGRES.stop();
  }

  @Test
  void migratesPlatformBeforeLastmileWithoutTheDefaultFlywayHistory() throws Exception {
    try (var context = start(Map.of(
        "spring.datasource.url", POSTGRES.getJdbcUrl(),
        "spring.datasource.username", POSTGRES.getUsername(),
        "spring.datasource.password", POSTGRES.getPassword()))) {
      assertThat(context.containsBean("platformDatabaseMigration")).isTrue();
      assertThat(context.containsBean("lastmileDatabaseMigration")).isTrue();
      assertThat(context.getBeanFactory().getDependenciesForBean("lastmileDatabaseMigration"))
          .contains("platformDatabaseMigration");
    }

    try (var connection = DriverManager.getConnection(
        POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        var statement = connection.createStatement();
        var result = statement.executeQuery("""
            select count(*)
            from information_schema.tables
            where table_schema = 'public'
              and table_name in (
                'flyway_platform_history',
                'flyway_lastmile_history',
                'mb_schema_probe',
                'biz_schema_probe'
              )
            """)) {
      result.next();
      assertThat(result.getInt(1)).isEqualTo(4);
    }

    try (var connection = DriverManager.getConnection(
        POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        var statement = connection.createStatement();
        var result = statement.executeQuery("""
            select to_regclass('public.flyway_schema_history') is null
            """)) {
      result.next();
      assertThat(result.getBoolean(1)).isTrue();
    }
  }

  @Test
  void refusesToStartWhenTheDatabaseCannotBeMigrated() {
    Throwable failure = null;
    try (var ignored = start(Map.of(
        "spring.datasource.url", "jdbc:postgresql://127.0.0.1:1/metabuilder",
        "spring.datasource.username", "invalid",
        "spring.datasource.password", "invalid",
        "spring.datasource.hikari.connection-timeout", "500"))) {
      // 启动成功即为契约失败，由后续断言统一报告。
    } catch (Throwable caught) {
      failure = caught;
    }

    assertThat(failure)
        .isNotNull()
        .hasStackTraceContaining("platformDatabaseMigration");
  }

  @Test
  void realApplicationRefusesToStartWithoutAnAuthenticationSecret() {
    Throwable failure = startAndCaptureFailure(null);

    assertThat(failure)
        .isNotNull()
        .hasRootCauseMessage("METABUILDER_AUTH_TOKEN_SECRET must be configured");
  }

  @Test
  void realApplicationRefusesToStartWithTheExampleAuthenticationSecret() {
    Throwable failure = startAndCaptureFailure("__GENERATED__");

    assertThat(failure)
        .isNotNull()
        .hasRootCauseMessage("METABUILDER_AUTH_TOKEN_SECRET must not use the example placeholder");
  }

  private org.springframework.context.ConfigurableApplicationContext start(
      Map<String, Object> databaseProperties) {
    return start(databaseProperties, VALID_SECRET);
  }

  private org.springframework.context.ConfigurableApplicationContext start(
      Map<String, Object> databaseProperties,
      String authenticationSecret) {
    var arguments = new ArrayList<String>();
    if (authenticationSecret != null) {
      arguments.add("--metabuilder.auth.token-secret=" + authenticationSecret);
      arguments.add("--metabuilder.auth.deployment-mode=test");
    }
    arguments.add("--spring.main.banner-mode=off");
    arguments.add("--logging.level.root=OFF");
    databaseProperties.forEach((key, value) -> arguments.add("--" + key + "=" + value));

    return new SpringApplicationBuilder(MetaBuilderApplication.class)
        .web(WebApplicationType.NONE)
        .run(arguments.toArray(String[]::new));
  }

  private Throwable startAndCaptureFailure(String authenticationSecret) {
    try (var ignored = start(Map.of(
        "spring.datasource.url", POSTGRES.getJdbcUrl(),
        "spring.datasource.username", POSTGRES.getUsername(),
        "spring.datasource.password", POSTGRES.getPassword()), authenticationSecret)) {
      return null;
    } catch (Throwable failure) {
      return failure;
    }
  }
}
