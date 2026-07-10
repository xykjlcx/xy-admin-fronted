package com.metabuild.app.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;

class MetaBuilderProductionArchitectureTest {

  private static final JavaClasses PRODUCTION_CLASSES = new ClassFileImporter()
      .withImportOption(new ImportOption.DoNotIncludeTests())
      .importPackages("com.metabuild");

  @Test
  void moduleDependenciesFollowTheP0aDirection() {
    MetaBuilderArchitectureRules.MODULE_DIRECTION.check(PRODUCTION_CLASSES);
  }

  @Test
  void adminImplementationIsPackageVertical() {
    MetaBuilderArchitectureRules.ADMIN_VERTICAL_SLICES.check(PRODUCTION_CLASSES);
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
}
