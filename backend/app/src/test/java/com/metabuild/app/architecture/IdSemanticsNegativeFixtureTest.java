package com.metabuild.app.architecture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.metabuild.admin.api.fixture.StringAdminApiIdViolation;
import com.metabuild.admin.api.fixture.LegalTraceMetadata;
import com.metabuild.app.fixture.LegalRevisionPath;
import com.metabuild.app.fixture.LongPathIdViolation;
import com.metabuild.app.fixture.StringPathIdViolation;
import com.metabuild.app.fixture.dto.UserPayloadViolation;
import com.metabuild.app.fixture.dto.UserWrapper;
import com.metabuild.api.contract.fixture.StringContractIdViolation;
import com.metabuild.modules.admin.users.api.StringAdminDomainApiIdViolation;
import com.metabuild.modules.admin.users.unconventional.LongPersistentIdViolation;
import com.metabuild.modules.admin.users.web.UserResourceViolation;
import com.metabuild.modules.lastmile.shipments.controller.LongLastmileControllerIdViolation;
import com.metabuild.modules.admin.users.persistence.LongEntityIdViolation;
import com.metabuild.modules.admin.users.persistence.StringEntityIdViolation;
import com.metabuild.shared.kernel.fixture.CurrentUser;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class IdSemanticsNegativeFixtureTest {

    @Test
    void persistentLongIdFixtureIsRejected() {
        assertViolation(
                IdSemanticsArchitectureRules.PERSISTENT_IDS_USE_UUID,
                LongEntityIdViolation.class);
    }

    @Test
    void persistentStringIdFixtureIsRejected() {
        assertViolation(
                IdSemanticsArchitectureRules.PERSISTENT_IDS_USE_UUID,
                StringEntityIdViolation.class);
    }

    @Test
    void pathVariableLongIdFixtureIsRejected() {
        assertViolation(
                IdSemanticsArchitectureRules.PATH_IDS_USE_UUID,
                LongPathIdViolation.class);
    }

    @Test
    void pathVariableStringIdFixtureIsRejected() {
        assertViolation(
                IdSemanticsArchitectureRules.PATH_IDS_USE_UUID,
                StringPathIdViolation.class);
    }

    @Test
    void nonIdLongPathVariableIsAllowed() {
        var result = IdSemanticsArchitectureRules.PATH_IDS_USE_UUID.evaluate(
                new ClassFileImporter().importClasses(LegalRevisionPath.class));

        assertFalse(result.hasViolation(), () -> result.getFailureReport().toString());
    }

    @Test
    void currentUserLongIdFixtureIsRejected() {
        assertViolation(
                IdSemanticsArchitectureRules.CURRENT_USER_IDS_USE_UUID,
                CurrentUser.class);
    }

    @Test
    void adminApiStringIdParameterFixtureIsRejected() {
        assertViolation(
                IdSemanticsArchitectureRules.API_RECORD_IDS_USE_UUID,
                StringAdminApiIdViolation.class);
    }

    @Test
    void apiTraceIdMetadataIsNotTreatedAsAPersistentResourceId() {
        var result = IdSemanticsArchitectureRules.API_RECORD_IDS_USE_UUID.evaluate(
                new ClassFileImporter().importClasses(LegalTraceMetadata.class));

        assertFalse(result.hasViolation(), () -> result.getFailureReport().toString());
    }

    @Test
    void everyApiBoundaryRejectsNonUuidIds() {
        assertViolation(
                IdSemanticsArchitectureRules.API_RECORD_IDS_USE_UUID,
                StringAdminDomainApiIdViolation.class,
                LongLastmileControllerIdViolation.class,
                StringContractIdViolation.class);
    }

    @Test
    void modulePersistentIdsCannotEscapeThroughAnUnconventionalPackage() {
        assertViolation(
                IdSemanticsArchitectureRules.PERSISTENT_IDS_USE_UUID,
                LongPersistentIdViolation.class);
    }

    @Test
    void annotatedControllerAndNestedDtoGraphRejectNonUuidIds() {
        var result = IdSemanticsArchitectureRules.API_RECORD_IDS_USE_UUID.evaluate(
                new ClassFileImporter().importClasses(
                        UserResourceViolation.class,
                        UserWrapper.class,
                        UserPayloadViolation.class));

        assertTrue(result.hasViolation(), () -> result.getFailureReport().toString());
        assertTrue(
                result.getFailureReport().toString().contains(UserResourceViolation.class.getName()),
                () -> result.getFailureReport().toString());
        assertTrue(
                result.getFailureReport().toString().contains(UserPayloadViolation.class.getName()),
                () -> result.getFailureReport().toString());
    }

    @Test
    void systemPrincipalLongZeroFixtureIsRejectedByAst() {
        Path fixture = fixture("SystemPrincipalZeroViolation.java");

        IdSemanticsSourceGuard.ScanResult result = IdSemanticsSourceGuard.scan(java.util.List.of(fixture));

        assertEquals(1, result.sourceCount());
        assertEquals(0, result.generatedSourceCount());
        assertTrue(result.violations().size() >= 12, () -> result.violations().toString());
        assertTrue(result.violations().stream().anyMatch(value -> value.contains("principal")));
        assertTrue(result.violations().stream().anyMatch(value -> value.contains("userId")));
        assertTrue(result.violations().stream().anyMatch(value -> value.contains("loginId")));
        assertTrue(result.violations().stream().anyMatch(value -> value.contains("currentUserId")));
        assertTrue(result.violations().stream().anyMatch(value -> value.contains("systemPrincipalId")));
        assertTrue(result.violations().stream().anyMatch(value -> value.contains("SystemLogin.login")));
        assertTrue(result.violations().stream().anyMatch(value -> value.contains("isSystem")));
        assertTrue(result.violations().stream().anyMatch(value -> value.contains("userIdOrSystem")));
        assertTrue(result.violations().stream().anyMatch(value -> value.contains("hasLegacySentinel")));
        assertTrue(result.violations().stream().anyMatch(value -> value.contains("hasNonPositiveSentinel")));
        assertTrue(result.violations().stream().anyMatch(value -> value.contains("usesObjectsEquality")));
        assertTrue(result.violations().stream().anyMatch(value -> value.contains("CurrentUserLike")));
    }

    @Test
    void legalLongZeroFixtureIsAllowedByAst() {
        IdSemanticsSourceGuard.ScanResult result =
                IdSemanticsSourceGuard.scan(java.util.List.of(fixture("LegalLongZero.java")));

        assertFalse(result.hasViolations(), () -> result.violations().toString());
    }

    private static void assertViolation(
            com.tngtech.archunit.lang.ArchRule rule, Class<?>... fixtures) {
        var result = rule.evaluate(new ClassFileImporter().importClasses(fixtures));
        assertTrue(result.hasViolation(), () -> "Fixture did not violate " + rule.getDescription());
        for (Class<?> fixture : fixtures) {
            assertTrue(
                    result.getFailureReport().toString().contains(fixture.getName()),
                    () -> result.getFailureReport().toString());
        }
    }

    private static Path fixture(String name) {
        return Path.of(
                System.getProperty("basedir"),
                "src/test/resources/id-guard-fixtures",
                name);
    }

}
