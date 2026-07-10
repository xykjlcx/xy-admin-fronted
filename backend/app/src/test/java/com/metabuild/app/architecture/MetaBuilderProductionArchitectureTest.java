package com.metabuild.app.architecture;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;

class MetaBuilderProductionArchitectureTest {

  private static final int MINIMUM_PRODUCTION_CLASS_COUNT = 70;
  private static final java.util.List<String> REQUIRED_MODULE_MARKERS = java.util.List.of(
      "com.metabuild.app.MetaBuilderApplicationMarker",
      "com.metabuild.shared.kernel.SharedKernelMarker",
      "com.metabuild.admin.api.AdminApiMarker",
      "com.metabuild.schema.platform.PlatformSchemaMarker",
      "com.metabuild.schema.lastmile.LastmileSchemaMarker",
      "com.metabuild.infrastructure.InfrastructureMarker",
      "com.metabuild.api.contract.ApiContractMarker",
      "com.metabuild.modules.admin.AdminModuleMarker",
      "com.metabuild.modules.lastmile.LastmileModuleMarker");

  private static final JavaClasses PRODUCTION_CLASSES = new ClassFileImporter()
      .withImportOption(new ImportOption.DoNotIncludeTests())
      .importPackages("com.metabuild");

  @Test
  void moduleDependenciesFollowTheP0aDirection() {
    MetaBuilderArchitectureRules.MODULE_DIRECTION.check(PRODUCTION_CLASSES);
  }

  @Test
  void adminDoesNotDependOnLastmileSchema() {
    MetaBuilderArchitectureRules.ADMIN_DOES_NOT_DEPEND_ON_LASTMILE_SCHEMA
        .check(PRODUCTION_CLASSES);
  }

  @Test
  void adminImplementationIsPackageVertical() {
    MetaBuilderArchitectureRules.ADMIN_VERTICAL_SLICES.check(PRODUCTION_CLASSES);
  }

  @Test
  void adminCrossDomainDependenciesUseTargetApiPackages() {
    MetaBuilderArchitectureRules.ADMIN_CROSS_DOMAIN_API_ONLY.check(PRODUCTION_CLASSES);
  }

  @Test
  void lastmileIsIsolatedFromPlatformSchemaAndAdminImplementation() {
    MetaBuilderArchitectureRules.LASTMILE_ISOLATION.check(PRODUCTION_CLASSES);
  }

  @Test
  void saTokenTypesStayInsideInfrastructureSecurityAdapters() {
    MetaBuilderArchitectureRules.SA_TOKEN_ISOLATION.check(PRODUCTION_CLASSES);
  }

  @Test
  void infrastructureDirectSlicesStayOnTheAllowlist() {
    MetaBuilderArchitectureRules.INFRASTRUCTURE_SLICE_ALLOWLIST.check(PRODUCTION_CLASSES);
  }

  @Test
  void productionClasspathContainsEveryModuleMarkerAndExpectedClassVolume() {
    assertTrue(
        PRODUCTION_CLASSES.size() >= MINIMUM_PRODUCTION_CLASS_COUNT,
        () -> "Production classpath drifted to " + PRODUCTION_CLASSES.size() + " classes");
    for (String marker : REQUIRED_MODULE_MARKERS) {
      assertDoesNotThrow(() -> PRODUCTION_CLASSES.get(marker), () -> "Missing marker: " + marker);
    }
  }
}
