package com.metabuild.admin.api;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(
        packages = {"com.metabuild.shared.kernel", "com.metabuild.admin.api"},
        importOptions = ImportOption.DoNotIncludeTests.class)
class AdminApiArchitectureTest {

    @ArchTest
    static final ArchRule PRODUCTION_TYPES_USE_ONLY_JDK_AND_CONTRACT_PACKAGES = classes()
            .should()
            .onlyDependOnClassesThat()
            .resideInAnyPackage(
                    "java..", "com.metabuild.shared.kernel..", "com.metabuild.admin.api..");
}
