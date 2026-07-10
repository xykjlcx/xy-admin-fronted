package com.metabuild.app.architecture;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import cn.dev33.satoken.fixture.FakeSaTokenType;
import com.metabuild.architecture.fixture.ModuleDirectionViolation;
import com.metabuild.app.MetaBuilderApplicationMarker;
import com.metabuild.infrastructure.InfrastructureMarker;
import com.metabuild.infrastructure.cache.InfrastructureSliceViolation;
import com.metabuild.infrastructure.web.InfrastructureDependencyViolation;
import com.metabuild.modules.admin.AdminDirectRootViolation;
import com.metabuild.modules.admin.AdminModuleMarker;
import com.metabuild.modules.admin.application.ApplicationRootViolation;
import com.metabuild.modules.admin.common.CommonRootViolation;
import com.metabuild.modules.admin.controller.AdminVerticalSliceViolation;
import com.metabuild.modules.admin.internal.InternalRootViolation;
import com.metabuild.modules.admin.persistence.PersistenceRootViolation;
import com.metabuild.modules.admin.roles.api.AllowedRoleApi;
import com.metabuild.modules.admin.roles.internal.ForbiddenRoleInternal;
import com.metabuild.modules.admin.shared.SharedRootViolation;
import com.metabuild.modules.admin.users.AdminToLastmileViolation;
import com.metabuild.modules.admin.users.AdminSchemaLastmileViolation;
import com.metabuild.modules.admin.users.AllowedCrossDomainApiFixture;
import com.metabuild.modules.admin.users.ForbiddenCrossDomainInternalFixture;
import com.metabuild.modules.admin.users.SaTokenIsolationViolation;
import com.metabuild.modules.admin.widgets.UnregisteredPluralDomainViolation;
import com.metabuild.modules.lastmile.LastmileModuleMarker;
import com.metabuild.modules.lastmile.shipments.LastmileIsolationViolation;
import com.metabuild.schema.lastmile.LastmileSchemaMarker;
import com.metabuild.schema.lastmile.fixture.LastmileSchemaCrossOwnerViolation;
import com.metabuild.schema.platform.PlatformSchemaMarker;
import com.metabuild.schema.platform.fixture.PlatformSchemaCrossOwnerViolation;
import com.metabuild.shared.kernel.fixture.CoreReverseDependencyViolation;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

class ArchitectureNegativeFixtureTest {

  @Test
  void moduleDirectionFixtureIsRejected() {
    assertViolation(
        MetaBuilderArchitectureRules.ONLY_APP_DEPENDS_ADMIN_IMPLEMENTATION,
        new ClassFileImporter().importClasses(ModuleDirectionViolation.class, AdminModuleMarker.class),
        "only app assembles admin implementation",
        ModuleDirectionViolation.class.getName());
  }

  @Test
  void adminToLastmileFixtureIsRejected() {
    assertViolation(
        MetaBuilderArchitectureRules.ONLY_APP_DEPENDS_LASTMILE_IMPLEMENTATION,
        new ClassFileImporter().importClasses(AdminToLastmileViolation.class, LastmileModuleMarker.class),
        "only app assembles lastmile implementation",
        AdminToLastmileViolation.class.getName());
  }

  @Test
  void coreReverseDependencyFixtureIsRejected() {
    assertViolation(
        MetaBuilderArchitectureRules.CORE_DEPENDENCIES_POINT_INWARD,
        new ClassFileImporter().importClasses(
            CoreReverseDependencyViolation.class,
            MetaBuilderApplicationMarker.class,
            InfrastructureMarker.class,
            AdminModuleMarker.class,
            LastmileModuleMarker.class),
        "core and contract modules do not depend outward",
        CoreReverseDependencyViolation.class.getName(),
        MetaBuilderApplicationMarker.class.getName(),
        InfrastructureMarker.class.getName(),
        AdminModuleMarker.class.getName(),
        LastmileModuleMarker.class.getName());
  }

  @Test
  void platformSchemaCrossOwnerFixtureIsRejected() {
    assertViolation(
        MetaBuilderArchitectureRules.PLATFORM_SCHEMA_OWNER_ISOLATION,
        new ClassFileImporter().importClasses(
            PlatformSchemaCrossOwnerViolation.class,
            LastmileSchemaMarker.class),
        "platform schema does not depend on lastmile schema",
        PlatformSchemaCrossOwnerViolation.class.getName());
  }

  @Test
  void lastmileSchemaCrossOwnerFixtureIsRejected() {
    assertViolation(
        MetaBuilderArchitectureRules.LASTMILE_SCHEMA_OWNER_ISOLATION,
        new ClassFileImporter().importClasses(
            LastmileSchemaCrossOwnerViolation.class,
            PlatformSchemaMarker.class),
        "lastmile schema does not depend on platform schema",
        LastmileSchemaCrossOwnerViolation.class.getName());
  }

  @Test
  void infrastructureOutwardDependencyFixtureIsRejected() {
    assertViolation(
        MetaBuilderArchitectureRules.INFRASTRUCTURE_DEPENDENCIES_POINT_INWARD,
        new ClassFileImporter().importClasses(
            InfrastructureDependencyViolation.class,
            AdminModuleMarker.class,
            LastmileModuleMarker.class,
            PlatformSchemaMarker.class,
            LastmileSchemaMarker.class),
        "infrastructure does not depend on business implementations or schemas",
        InfrastructureDependencyViolation.class.getName(),
        AdminModuleMarker.class.getName(),
        LastmileModuleMarker.class.getName(),
        PlatformSchemaMarker.class.getName(),
        LastmileSchemaMarker.class.getName());
  }

  @Test
  void adminToLastmileSchemaFixtureIsRejected() {
    assertViolation(
        MetaBuilderArchitectureRules.ADMIN_DOES_NOT_DEPEND_ON_LASTMILE_SCHEMA,
        new ClassFileImporter().importClasses(
            AdminSchemaLastmileViolation.class,
            LastmileSchemaMarker.class),
        "admin does not depend on lastmile schema",
        AdminSchemaLastmileViolation.class.getName(),
        LastmileSchemaMarker.class.getName());
  }

  @Test
  void adminVerticalSliceFixtureIsRejected() {
    assertViolation(
        MetaBuilderArchitectureRules.ADMIN_VERTICAL_SLICES,
        new ClassFileImporter().importClasses(
            AdminVerticalSliceViolation.class,
            AdminDirectRootViolation.class,
            UnregisteredPluralDomainViolation.class,
            ApplicationRootViolation.class,
            PersistenceRootViolation.class,
            CommonRootViolation.class,
            SharedRootViolation.class,
            InternalRootViolation.class),
        "admin implementation is package-vertical",
        AdminVerticalSliceViolation.class.getName(),
        AdminDirectRootViolation.class.getName(),
        UnregisteredPluralDomainViolation.class.getName(),
        ApplicationRootViolation.class.getName(),
        PersistenceRootViolation.class.getName(),
        CommonRootViolation.class.getName(),
        SharedRootViolation.class.getName(),
        InternalRootViolation.class.getName());
  }

  @Test
  void adminCrossDomainInternalFixtureIsRejected() {
    assertViolation(
        MetaBuilderArchitectureRules.ADMIN_CROSS_DOMAIN_API_ONLY,
        new ClassFileImporter().importClasses(
            ForbiddenCrossDomainInternalFixture.class,
            ForbiddenRoleInternal.class),
        "admin cross-domain dependencies use target api packages",
        ForbiddenCrossDomainInternalFixture.class.getName(),
        ForbiddenRoleInternal.class.getName());
  }

  @Test
  void adminCrossDomainApiFixtureIsAllowed() {
    var classes = new ClassFileImporter().importClasses(
        AllowedCrossDomainApiFixture.class,
        AllowedRoleApi.class);
    var result = MetaBuilderArchitectureRules.ADMIN_CROSS_DOMAIN_API_ONLY.evaluate(classes);
    assertFalse(result.hasViolation(), () -> result.getFailureReport().toString());
  }

  @Test
  void lastmileIsolationFixtureIsRejected() {
    assertViolation(
        MetaBuilderArchitectureRules.LASTMILE_ISOLATION,
        new ClassFileImporter().importClasses(
            LastmileIsolationViolation.class,
            AdminModuleMarker.class,
            PlatformSchemaMarker.class),
        "lastmile does not depend on platform schema or admin implementation",
        LastmileIsolationViolation.class.getName(),
        AdminModuleMarker.class.getName(),
        PlatformSchemaMarker.class.getName());
  }

  @Test
  void saTokenIsolationFixtureIsRejected() {
    assertViolation(
        MetaBuilderArchitectureRules.SA_TOKEN_ISOLATION,
        new ClassFileImporter().importClasses(SaTokenIsolationViolation.class, FakeSaTokenType.class),
        "Sa-Token types stay inside infrastructure security adapters",
        SaTokenIsolationViolation.class.getName());
  }

  @Test
  void infrastructureSliceFixtureIsRejected() {
    assertViolation(
        MetaBuilderArchitectureRules.INFRASTRUCTURE_SLICE_ALLOWLIST,
        new ClassFileImporter().importClasses(InfrastructureSliceViolation.class),
        "infrastructure direct slices stay on the P0a allowlist",
        InfrastructureSliceViolation.class.getName());
  }

  private static void assertViolation(
      ArchRule rule,
      com.tngtech.archunit.core.domain.JavaClasses classes,
      String expectedDescription,
      String... expectedFixtures) {
    var result = rule.evaluate(classes);
    assertTrue(result.hasViolation(), () -> "Fixture did not violate: " + expectedDescription);
    String report = result.getFailureReport().toString();
    assertTrue(report.contains(expectedDescription), () -> "Wrong rule failed: " + report);
    for (String expectedFixture : expectedFixtures) {
      assertTrue(report.contains(expectedFixture), () -> "Wrong fixture failed: " + report);
    }
  }
}
