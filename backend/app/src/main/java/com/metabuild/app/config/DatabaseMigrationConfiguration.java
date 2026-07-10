package com.metabuild.app.config;

import com.metabuild.schema.lastmile.LastmileFlywayRunner;
import com.metabuild.schema.platform.PlatformFlywayRunner;
import javax.sql.DataSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class DatabaseMigrationConfiguration {

  @Bean
  PlatformDatabaseMigration platformDatabaseMigration(DataSource dataSource) {
    var result = PlatformFlywayRunner.migrate(dataSource);
    return new PlatformDatabaseMigration(result.migrationsExecuted);
  }

  @Bean
  LastmileDatabaseMigration lastmileDatabaseMigration(
      DataSource dataSource,
      PlatformDatabaseMigration platformDatabaseMigration) {
    var result = LastmileFlywayRunner.migrate(dataSource);
    return new LastmileDatabaseMigration(result.migrationsExecuted);
  }

  record PlatformDatabaseMigration(int migrationsExecuted) {}

  record LastmileDatabaseMigration(int migrationsExecuted) {}
}
