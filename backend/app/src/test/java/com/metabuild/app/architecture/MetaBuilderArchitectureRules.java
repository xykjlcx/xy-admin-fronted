package com.metabuild.app.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import com.tngtech.archunit.lang.CompositeArchRule;
import java.util.Set;

final class MetaBuilderArchitectureRules {

  private static final String APP = "com.metabuild.app..";
  private static final String SHARED_KERNEL = "com.metabuild.shared.kernel..";
  private static final String ADMIN_API = "com.metabuild.admin.api..";
  private static final String API_CONTRACT = "com.metabuild.api.contract..";
  private static final String SCHEMA_PLATFORM = "com.metabuild.schema.platform..";
  private static final String SCHEMA_LASTMILE = "com.metabuild.schema.lastmile..";
  private static final String INFRASTRUCTURE = "com.metabuild.infrastructure..";
  private static final String ADMIN = "com.metabuild.modules.admin..";
  private static final String LASTMILE = "com.metabuild.modules.lastmile..";
  private static final String ADMIN_ROOT = "com.metabuild.modules.admin";
  private static final String INFRASTRUCTURE_ROOT = "com.metabuild.infrastructure";
  private static final Set<String> FORBIDDEN_ADMIN_ROOT_SLICES =
      Set.of("controller", "service", "repository", "dto", "model", "config", "api");
  private static final Set<String> ALLOWED_INFRASTRUCTURE_SLICES =
      Set.of("web", "exception", "i18n", "observability", "jooq", "security");

  static final ArchRule ONLY_APP_DEPENDS_ADMIN_IMPLEMENTATION = noClasses()
      .that().resideOutsideOfPackages(APP, ADMIN)
      .should().dependOnClassesThat().resideInAPackage(ADMIN)
      .as("only app assembles admin implementation");

  static final ArchRule ONLY_APP_DEPENDS_LASTMILE_IMPLEMENTATION = noClasses()
      .that().resideOutsideOfPackages(APP, LASTMILE)
      .should().dependOnClassesThat().resideInAPackage(LASTMILE)
      .as("only app assembles lastmile implementation");

  static final ArchRule CORE_DEPENDENCIES_POINT_INWARD = noClasses()
      .that().resideInAnyPackage(
          SHARED_KERNEL,
          ADMIN_API,
          API_CONTRACT,
          SCHEMA_PLATFORM,
          SCHEMA_LASTMILE)
      .should().dependOnClassesThat().resideInAnyPackage(APP, INFRASTRUCTURE, ADMIN, LASTMILE)
      .as("core and contract modules do not depend outward");

  static final ArchRule PLATFORM_SCHEMA_OWNER_ISOLATION = noClasses()
      .that().resideInAPackage(SCHEMA_PLATFORM)
      .should().dependOnClassesThat().resideInAPackage(SCHEMA_LASTMILE)
      .as("platform schema does not depend on lastmile schema");

  static final ArchRule LASTMILE_SCHEMA_OWNER_ISOLATION = noClasses()
      .that().resideInAPackage(SCHEMA_LASTMILE)
      .should().dependOnClassesThat().resideInAPackage(SCHEMA_PLATFORM)
      .as("lastmile schema does not depend on platform schema");

  static final ArchRule INFRASTRUCTURE_DEPENDENCIES_POINT_INWARD = noClasses()
      .that().resideInAPackage(INFRASTRUCTURE)
      .should().dependOnClassesThat().resideInAnyPackage(
          ADMIN, LASTMILE, SCHEMA_PLATFORM, SCHEMA_LASTMILE)
      .as("infrastructure does not depend on business implementations or schemas");

  static final ArchRule MODULE_DIRECTION = CompositeArchRule.of(
          ONLY_APP_DEPENDS_ADMIN_IMPLEMENTATION)
      .and(ONLY_APP_DEPENDS_LASTMILE_IMPLEMENTATION)
      .and(CORE_DEPENDENCIES_POINT_INWARD)
      .and(PLATFORM_SCHEMA_OWNER_ISOLATION)
      .and(LASTMILE_SCHEMA_OWNER_ISOLATION)
      .and(INFRASTRUCTURE_DEPENDENCIES_POINT_INWARD)
      .as("module dependencies follow the P0a direction");

  static final ArchRule ADMIN_VERTICAL_SLICES = classes()
      .that().resideInAPackage(ADMIN)
      .should(new ArchCondition<>("put admin business classes below a business-domain slice") {
        @Override
        public void check(JavaClass javaClass, ConditionEvents events) {
          String packageName = javaClass.getPackageName();
          boolean marker = packageName.equals(ADMIN_ROOT)
              && javaClass.getSimpleName().equals("AdminModuleMarker");
          boolean packageDescriptor = packageName.equals(ADMIN_ROOT)
              && javaClass.getSimpleName().equals("package-info");
          boolean directBusinessClass = packageName.equals(ADMIN_ROOT) && !marker && !packageDescriptor;
          String directSlice = directChildPackage(packageName, ADMIN_ROOT);
          boolean horizontalRoot = FORBIDDEN_ADMIN_ROOT_SLICES.contains(directSlice);

          if (directBusinessClass || horizontalRoot) {
            events.add(SimpleConditionEvent.violated(
                javaClass,
                javaClass.getName() + " must start with an admin business-domain package"));
          }
        }
      })
      .as("admin implementation is package-vertical");

  static final ArchRule LASTMILE_ISOLATION = noClasses()
      .that().resideInAPackage(LASTMILE)
      .should().dependOnClassesThat().resideInAnyPackage(SCHEMA_PLATFORM, ADMIN)
      .as("lastmile does not depend on platform schema or admin implementation");

  static final ArchRule SA_TOKEN_ISOLATION = noClasses()
      .that().resideOutsideOfPackage("com.metabuild.infrastructure.security..")
      .should().dependOnClassesThat().resideInAPackage("cn.dev33.satoken..")
      .as("Sa-Token types stay inside infrastructure security adapters");

  static final ArchRule INFRASTRUCTURE_SLICE_ALLOWLIST = classes()
      .that().resideInAPackage(INFRASTRUCTURE)
      .should(new ArchCondition<>("belong to an approved direct infrastructure slice") {
        @Override
        public void check(JavaClass javaClass, ConditionEvents events) {
          String packageName = javaClass.getPackageName();
          boolean marker = packageName.equals(INFRASTRUCTURE_ROOT)
              && javaClass.getSimpleName().equals("InfrastructureMarker");
          boolean packageDescriptor = packageName.equals(INFRASTRUCTURE_ROOT)
              && javaClass.getSimpleName().equals("package-info");
          String directSlice = directChildPackage(packageName, INFRASTRUCTURE_ROOT);

          if (!marker && !packageDescriptor && !ALLOWED_INFRASTRUCTURE_SLICES.contains(directSlice)) {
            events.add(SimpleConditionEvent.violated(
                javaClass,
                javaClass.getName() + " is outside the infrastructure slice allowlist"));
          }
        }
      })
      .as("infrastructure direct slices stay on the P0a allowlist");

  private MetaBuilderArchitectureRules() {}

  private static String directChildPackage(String packageName, String rootPackage) {
    if (!packageName.startsWith(rootPackage + ".")) {
      return "";
    }
    String remainder = packageName.substring(rootPackage.length() + 1);
    int separator = remainder.indexOf('.');
    return separator < 0 ? remainder : remainder.substring(0, separator);
  }
}
