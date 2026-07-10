package com.metabuild.schema.lastmile;

import java.util.Objects;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.flywaydb.core.api.output.MigrateResult;

public final class LastmileFlywayRunner {

  public static final String LOCATION = "classpath:db/migration/lastmile";
  public static final String HISTORY_TABLE = "flyway_lastmile_history";

  private LastmileFlywayRunner() {}

  public static MigrateResult migrate(DataSource dataSource) {
    return configured(dataSource).migrate();
  }

  public static void validate(DataSource dataSource) {
    configured(dataSource).validate();
  }

  private static Flyway configured(DataSource dataSource) {
    return Flyway.configure()
        .dataSource(Objects.requireNonNull(dataSource, "dataSource"))
        .locations(LOCATION)
        .table(HISTORY_TABLE)
        .baselineOnMigrate(true)
        .baselineVersion(MigrationVersion.fromVersion("0"))
        .load();
  }
}
