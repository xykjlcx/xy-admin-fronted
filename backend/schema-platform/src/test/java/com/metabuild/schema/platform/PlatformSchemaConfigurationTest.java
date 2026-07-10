package com.metabuild.schema.platform;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;

class PlatformSchemaConfigurationTest {

  @Test
  void locksToolchainAndPlatformCodegenOwnership() throws IOException {
    String parentPom = Files.readString(moduleDirectory().resolve("../pom.xml").normalize());
    String modulePom = Files.readString(moduleDirectory().resolve("pom.xml"));

    assertTrue(parentPom.contains("<jooq.version>3.19.24</jooq.version>"));
    assertTrue(parentPom.contains("<flyway.version>11.7.2</flyway.version>"));
    assertTrue(parentPom.contains("<postgresql.version>42.7.7</postgresql.version>"));
    assertTrue(parentPom.contains("<testcontainers.version>1.21.4</testcontainers.version>"));
    assertTrue(modulePom.contains("postgres:16-alpine"));
    assertTrue(modulePom.contains("db/migration/platform"));
    assertTrue(modulePom.contains("<table>flyway_platform_history</table>"));
    assertTrue(modulePom.contains("<includes>^mb_.*$</includes>"));
    assertTrue(modulePom.contains("<packageName>com.metabuild.schema.platform</packageName>"));
    assertTrue(modulePom.contains("<generatedAnnotationDate>false</generatedAnnotationDate>"));
    assertTrue(modulePom.contains("<generatedAnnotationJooqVersion>false</generatedAnnotationJooqVersion>"));
    assertFalse(modulePom.contains("(mb_|biz_).*"));
  }

  @Test
  void generatedPlatformSourcesContainOnlyPlatformTables() throws IOException {
    Path generatedRoot = moduleDirectory().resolve("src/main/jooq-generated");
    assertTrue(Files.isDirectory(generatedRoot), "platform generated sources must be committed");

    List<Path> javaFiles;
    try (var paths = Files.walk(generatedRoot)) {
      javaFiles = paths.filter(path -> path.toString().endsWith(".java")).toList();
    }
    assertFalse(javaFiles.isEmpty(), "platform generated sources must contain Java files");

    String generatedSources = readAll(javaFiles);
    assertTrue(generatedSources.contains("package com.metabuild.schema.platform"));
    assertTrue(generatedSources.contains("\"mb_schema_probe\""));
    assertFalse(generatedSources.contains("\"biz_"));
    assertFalse(generatedSources.contains("com.metabuild.schema.lastmile"));
    assertFalse(generatedSources.contains("jOOQ version:"));
    assertFalse(generatedSources.contains("date ="));
  }

  private static Path moduleDirectory() {
    return Path.of("").toAbsolutePath();
  }

  private static String readAll(List<Path> files) throws IOException {
    StringBuilder contents = new StringBuilder();
    for (Path file : files) {
      contents.append(Files.readString(file));
    }
    return contents.toString();
  }
}
