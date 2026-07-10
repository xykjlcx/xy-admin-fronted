package com.metabuilder.schema.platform;

import java.util.Objects;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;
import org.flywaydb.core.api.output.ValidateResult;

public final class PlatformFlywayRunner {

  public static final String LOCATION = "classpath:db/migration/platform";
  public static final String HISTORY_TABLE = "flyway_platform_history";

  private PlatformFlywayRunner() {}

  public static MigrateResult migrate(DataSource dataSource) {
    return configured(dataSource).migrate();
  }

  public static ValidateResult validate(DataSource dataSource) {
    return configured(dataSource).validateWithResult();
  }

  private static Flyway configured(DataSource dataSource) {
    return Flyway.configure()
        .dataSource(Objects.requireNonNull(dataSource, "dataSource"))
        .locations(LOCATION)
        .table(HISTORY_TABLE)
        .load();
  }
}
