package com.metabuild.app.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.metabuild.modules.admin.menus.persistence.JdbcMenuRepository;
import com.metabuild.schema.platform.PlatformFlywayRunner;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class MenuLocaleV9UpgradePostgresTest {

  private static final UUID PARENT_ID =
      UUID.fromString("01900000-0009-7000-8000-000000000001");
  private static final UUID RUNTIME_ID =
      UUID.fromString("01900000-0009-7000-8000-000000000002");

  @Test
  void upgradesARealV7RuntimeMenuWithoutLosingIdentityParentOrReloadableLabel() {
    String baseUrl = System.getProperty("task18.pg.url");
    Assumptions.assumeTrue(baseUrl != null, "set task18.pg.url to a disposable PostgreSQL database");

    String schema = "task18_v9_upgrade_" + UUID.randomUUID().toString().replace("-", "");
    String user = System.getProperty("task18.pg.user", "ocean");
    String password = System.getProperty("task18.pg.password", "");
    var administration = new JdbcTemplate(new DriverManagerDataSource(baseUrl, user, password));
    administration.execute("create schema " + schema);

    var dataSource =
        new DriverManagerDataSource(withCurrentSchema(baseUrl, schema), user, password);
    var jdbc = new JdbcTemplate(dataSource);
    try {
      Flyway.configure()
          .dataSource(dataSource)
          .locations(PlatformFlywayRunner.LOCATION)
          .table(PlatformFlywayRunner.HISTORY_TABLE)
          .target("7")
          .load()
          .migrate();

      jdbc.update(
          """
          insert into mb_menu(
              id, source_key, origin, subsystem_key, default_label_key, default_type)
          values (?, '/task18/history-parent#page', 'CATALOG', 'admin', 'history.parent', 'dir')
          """,
          PARENT_ID);
      jdbc.update(
          """
          insert into mb_menu(
              id, origin, subsystem_key, default_label_key, default_type)
          values (?, 'RUNTIME', 'admin', 'history.runtime', 'dir')
          """,
          RUNTIME_ID);
      jdbc.update(
          """
          insert into mb_menu_customization(menu_id, parent_overridden, parent_id)
          values (?, true, ?)
          """,
          RUNTIME_ID,
          PARENT_ID);

      PlatformFlywayRunner.migrate(dataSource);
      PlatformFlywayRunner.validate(dataSource);

      assertThat(jdbc.queryForObject("select id from mb_menu where id=?", UUID.class, RUNTIME_ID))
          .isEqualTo(RUNTIME_ID);
      assertThat(
              jdbc.queryForObject(
                  "select parent_id from mb_menu_customization where menu_id=?",
                  UUID.class,
                  RUNTIME_ID))
          .isEqualTo(PARENT_ID);
      assertThat(jdbc.queryForObject("select runtime_label::text from mb_menu where id=?", String.class, RUNTIME_ID))
          .isEqualTo("{\"und\": \"history.runtime\"}");

      var reloaded =
          new JdbcMenuRepository(jdbc, new ObjectMapper())
              .findActive("admin").stream()
              .filter(row -> row.id().equals(RUNTIME_ID))
              .findFirst()
              .orElseThrow();
      assertThat(reloaded.id()).isEqualTo(RUNTIME_ID);
      assertThat(reloaded.parentId()).isEqualTo(PARENT_ID);
      assertThat(reloaded.localizedLabel())
          .containsExactlyEntriesOf(java.util.Map.of("und", "history.runtime"));

      assertConstraintViolation(
          jdbc, "update mb_menu set runtime_label='{\"und\":123}'::jsonb where id='" + RUNTIME_ID + "'");
      assertConstraintViolation(
          jdbc, "update mb_menu set runtime_label='{}'::jsonb where id='" + RUNTIME_ID + "'");
      assertConstraintViolation(
          jdbc, "update mb_menu set runtime_label='{\"\":\"label\"}'::jsonb where id='" + RUNTIME_ID + "'");
      assertConstraintViolation(
          jdbc, "update mb_menu set runtime_label='{\"und\":\"\"}'::jsonb where id='" + RUNTIME_ID + "'");
      assertConstraintViolation(
          jdbc,
          "update mb_menu_customization set localized_label='{\"und\":null}'::jsonb where menu_id='"
              + RUNTIME_ID
              + "'");
      assertConstraintViolation(
          jdbc,
          "update mb_menu_customization set localized_label='{}'::jsonb where menu_id='"
              + RUNTIME_ID
              + "'");
      assertConstraintViolation(
          jdbc,
          "update mb_menu_customization set localized_label='{\"und\":123}'::jsonb where menu_id='"
              + RUNTIME_ID
              + "'");
    } finally {
      administration.execute("drop schema " + schema + " cascade");
    }
  }

  private static void assertConstraintViolation(JdbcTemplate jdbc, String sql) {
    assertThatThrownBy(() -> jdbc.execute(sql))
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasRootCauseInstanceOf(org.postgresql.util.PSQLException.class)
        .rootCause()
        .extracting(failure -> ((org.postgresql.util.PSQLException) failure).getSQLState())
        .isEqualTo("23514");
  }

  private static String withCurrentSchema(String url, String schema) {
    return url + (url.contains("?") ? "&" : "?") + "currentSchema=" + schema;
  }
}
