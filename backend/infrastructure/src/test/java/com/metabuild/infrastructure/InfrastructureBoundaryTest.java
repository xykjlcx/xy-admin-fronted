package com.metabuild.infrastructure;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;

class InfrastructureBoundaryTest {

    private static final List<String> REQUIRED_SLICES =
            List.of("web", "exception", "i18n", "observability", "jooq", "security");

    @Test
    void declaresRequiredInfrastructureSlices() {
        Path packageRoot = Path.of(
                System.getProperty("basedir"),
                "src/main/java/com/metabuild/infrastructure");

        for (String slice : REQUIRED_SLICES) {
            assertTrue(Files.isDirectory(packageRoot.resolve(slice)), () -> "Missing slice: " + slice);
        }
    }

    @Test
    void doesNotIntroduceSaTokenBehavior() throws Exception {
        Path sourceRoot = Path.of(System.getProperty("basedir"), "src/main/java");

        try (var files = Files.walk(sourceRoot)) {
            boolean containsSaToken = files
                    .filter(path -> path.toString().endsWith(".java"))
                    .map(InfrastructureBoundaryTest::read)
                    .anyMatch(source -> source.contains("satoken") || source.contains("cn.dev33"));
            assertFalse(containsSaToken);
        }
    }

    @Test
    void keepsExistingTestcontainersLockAheadOfSpringBootBom() throws Exception {
        String parentPom = Files.readString(Path.of(System.getProperty("basedir"), "../pom.xml"));
        int testcontainersBom = parentPom.indexOf("<artifactId>testcontainers-bom</artifactId>");
        int springBootBom = parentPom.indexOf("<artifactId>spring-boot-dependencies</artifactId>");

        assertTrue(testcontainersBom >= 0, "Testcontainers BOM must be imported");
        assertTrue(testcontainersBom < springBootBom, "Existing Testcontainers lock must win BOM precedence");
    }

    private static String read(Path path) {
        try {
            return Files.readString(path);
        } catch (java.io.IOException exception) {
            throw new IllegalStateException("Failed to read " + path, exception);
        }
    }
}
