package com.metabuild.schema.lastmile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;

class LastmileSchemaConfigurationTest {

  @Test
  void locksLastmileCodegenOwnershipWithoutAPlatformRuntimeDependency() throws IOException {
    String modulePom = Files.readString(moduleDirectory().resolve("pom.xml"));

    assertTrue(modulePom.contains("postgres:16-alpine"));
    assertTrue(modulePom.contains("db/migration/lastmile"));
    assertTrue(modulePom.contains("<table>flyway_lastmile_history</table>"));
    assertTrue(modulePom.contains("<includes>^biz_.*$</includes>"));
    assertTrue(modulePom.contains("<packageName>com.metabuild.schema.lastmile</packageName>"));
    assertTrue(modulePom.contains("<generatedAnnotationDate>false</generatedAnnotationDate>"));
    assertTrue(modulePom.contains("<generatedAnnotationJooqVersion>false</generatedAnnotationJooqVersion>"));
    assertFalse(modulePom.contains("(mb_|biz_).*"));
    assertFalse(modulePom.contains("<activeByDefault>"));
    assertFalse(modulePom.contains("<id>schema-integration-tests</id>"));
    int platformDependency =
        modulePom.indexOf("<artifactId>metabuilder-schema-platform</artifactId>");
    assertTrue(platformDependency >= 0);
    assertTrue(platformDependency < modulePom.indexOf("</dependencies>"));
    assertEquals(
        -1,
        modulePom.indexOf(
            "<artifactId>metabuilder-schema-platform</artifactId>", platformDependency + 1));
    int dependencyStart = modulePom.lastIndexOf("<dependency>", platformDependency);
    int dependencyEnd = modulePom.indexOf("</dependency>", platformDependency);
    String platformDependencyBlock = modulePom.substring(dependencyStart, dependencyEnd);
    assertTrue(platformDependencyBlock.contains("<scope>test</scope>"));
  }

  @Test
  void generatedLastmileSourcesContainOnlyLastmileTables() throws IOException {
    Path generatedRoot = moduleDirectory().resolve("src/main/jooq-generated");
    assertTrue(Files.isDirectory(generatedRoot), "lastmile generated sources must be committed");

    List<Path> javaFiles;
    try (var paths = Files.walk(generatedRoot)) {
      javaFiles = paths.filter(path -> path.toString().endsWith(".java")).toList();
    }
    assertFalse(javaFiles.isEmpty(), "lastmile generated sources must contain Java files");

    String generatedSources = readAll(javaFiles);
    assertTrue(generatedSources.contains("package com.metabuild.schema.lastmile"));
    assertTrue(generatedSources.contains("\"biz_schema_probe\""));
    assertFalse(generatedSources.contains("\"mb_"));
    assertFalse(generatedSources.contains("com.metabuild.schema.platform"));
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
