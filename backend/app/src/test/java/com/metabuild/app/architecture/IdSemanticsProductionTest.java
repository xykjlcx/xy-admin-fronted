package com.metabuild.app.architecture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.metabuild.admin.api.DepartmentSummary;
import com.metabuild.admin.api.FileMetadata;
import com.metabuild.admin.api.UserSummary;
import com.metabuild.schema.lastmile.tables.BizSchemaProbe;
import com.metabuild.schema.lastmile.tables.records.BizSchemaProbeRecord;
import com.metabuild.schema.platform.tables.MbSchemaProbe;
import com.metabuild.schema.platform.tables.records.MbSchemaProbeRecord;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import java.lang.reflect.ParameterizedType;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class IdSemanticsProductionTest {

    private static final int MINIMUM_PRODUCTION_CLASS_COUNT = 75;
    private static final int MINIMUM_PRODUCTION_SOURCE_COUNT = 70;
    private static final int MINIMUM_GENERATED_SOURCE_COUNT = 12;

    private static final JavaClasses PRODUCTION_CLASSES = new ClassFileImporter()
            .withImportOption(new ImportOption.DoNotIncludeTests())
            .importPackages("com.metabuild");

    @Test
    void productionClassesUseUuidForEveryGuardedIdBoundary() {
        assertTrue(
                PRODUCTION_CLASSES.size() >= MINIMUM_PRODUCTION_CLASS_COUNT,
                () -> "Production class scan is unexpectedly small: " + PRODUCTION_CLASSES.size());

        IdSemanticsArchitectureRules.ALL_ID_TYPES_USE_UUID.check(PRODUCTION_CLASSES);
    }

    @Test
    void productionSourcesAndGeneratedTreesRejectSystemPrincipalLongZero() {
        Path backendRoot = Path.of(System.getProperty("basedir")).getParent();

        IdSemanticsSourceGuard.ScanResult result = IdSemanticsSourceGuard.scanProduction(backendRoot);

        assertTrue(
                result.sourceCount() >= MINIMUM_PRODUCTION_SOURCE_COUNT,
                () -> "Production source scan is unexpectedly small: " + result.sourceCount());
        assertTrue(
                result.generatedSourceCount() >= MINIMUM_GENERATED_SOURCE_COUNT,
                () -> "Generated source scan is unexpectedly small: " + result.generatedSourceCount());
        assertFalse(result.hasViolations(), () -> result.violations().toString());
    }

    @Test
    void currentApiRecordIdsAreReallyUuidTyped() {
        assertRecordComponent(UserSummary.class, "id", UUID.class);
        assertRecordComponent(UserSummary.class, "deptId", UUID.class);
        assertRecordComponent(DepartmentSummary.class, "id", UUID.class);
        assertRecordComponent(DepartmentSummary.class, "parentId", UUID.class);
        assertRecordComponent(FileMetadata.class, "id", UUID.class);
    }

    @Test
    void currentJooqGeneratedIdFieldsAndRecordsAreReallyUuidTyped() throws Exception {
        assertEquals(UUID.class, MbSchemaProbeRecord.class.getMethod("getId").getReturnType());
        assertEquals(UUID.class, BizSchemaProbeRecord.class.getMethod("getId").getReturnType());
        assertJooqIdType(MbSchemaProbe.class);
        assertJooqIdType(BizSchemaProbe.class);
    }

    private static void assertRecordComponent(Class<?> recordType, String name, Class<?> expectedType) {
        Class<?> actualType = List.of(recordType.getRecordComponents()).stream()
                .filter(component -> component.getName().equals(name))
                .findFirst()
                .orElseThrow()
                .getType();
        assertEquals(expectedType, actualType);
    }

    private static void assertJooqIdType(Class<?> tableType) throws Exception {
        ParameterizedType type = (ParameterizedType) tableType.getField("ID").getGenericType();
        assertEquals(UUID.class, type.getActualTypeArguments()[1]);
    }
}
