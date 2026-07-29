package com.metabuild.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.metabuild.admin.api.security.RequiresPermissions;
import com.metabuild.api.contract.permissions.PermissionCatalogLoader;
import com.metabuild.api.contract.permissions.PermissionContractVerifier;
import com.metabuild.api.contract.permissions.PermissionOperationCustomizer;
import io.swagger.v3.oas.models.Operation;
import java.lang.reflect.Method;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.HandlerMethod;

class PermissionControllerCoverageTest {
    private static final Set<String> SHELL_OR_AUTH_BASELINES = Set.of(
            "/api/auth", "/api/menus", "/api/messages", "/api/subsystems", "/api/profile");

    @Test
    void scansEveryProductionControllerAndRequiresMachineReadablePermissionsOutsideBaseline() throws Exception {
        Set<Class<?>> controllers = productionControllers();
        assertThat(controllers).extracting(Class::getSimpleName).containsExactlyInAnyOrder(
                "AuthController", "DashboardController", "MenuController", "ShellMessageController", "SubsystemController",
                "UserControllerContract","DepartmentControllerContract","RoleControllerContract",
                "DictionaryController","CompanyController","ProfileController","AuditController");
        Set<String> consumed = validateCoverage(controllers);
        var loader = new PermissionCatalogLoader(new ObjectMapper());
        PermissionContractVerifier.verify(loader.load("permissions/permission-catalog.json"),
                loader.loadMenu("permissions/menu-seed.json"), consumed);
    }

    @Test
    void failsForMissingAnnotationAndUnknownConsumedCodeFixtures() {
        assertThrows(IllegalArgumentException.class, () -> validateCoverage(Set.of(MissingPermissionController.class)));
        var loader = new PermissionCatalogLoader(new ObjectMapper());
        assertThrows(IllegalArgumentException.class, () -> PermissionContractVerifier.verify(
                loader.load("permissions/permission-catalog.json"), loader.loadMenu("permissions/menu-seed.json"),
                validateCoverage(Set.of(UnknownPermissionController.class))));
    }

    private static Set<Class<?>> productionControllers() throws Exception {
        var scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));
        Set<Class<?>> result = new LinkedHashSet<>();
        for (var bean : scanner.findCandidateComponents("com.metabuild.modules")) {
            Class<?> candidate = Class.forName(bean.getBeanClassName());
            String location = candidate.getProtectionDomain().getCodeSource().getLocation().toString();
            if (!location.contains("test-classes")) result.add(candidate);
        }
        return result;
    }

    private static Set<String> validateCoverage(Set<Class<?>> controllers) {
        Set<String> consumed = new LinkedHashSet<>();
        PermissionOperationCustomizer customizer = new PermissionOperationCustomizer();
        for (Class<?> controller : controllers) {
            RequestMapping classMapping = AnnotatedElementUtils.findMergedAnnotation(controller, RequestMapping.class);
            String base = classMapping == null || classMapping.value().length == 0 ? "" : classMapping.value()[0];
            for (Method method : controller.getDeclaredMethods()) {
                RequestMapping mapping = AnnotatedElementUtils.findMergedAnnotation(method, RequestMapping.class);
                if (mapping == null) continue;
                RequiresPermissions required = method.getAnnotation(RequiresPermissions.class);
                if (!SHELL_OR_AUTH_BASELINES.contains(base) && required == null) {
                    throw new IllegalArgumentException("Mapped operation lacks @RequiresPermissions: " + controller.getName() + '#' + method.getName());
                }
                if (required == null) continue;
                consumed.addAll(List.of(required.codes()));
                Operation operation = customizer.customize(new Operation(), new HandlerMethod(controller, method));
                @SuppressWarnings("unchecked") var extension = (java.util.Map<String, Object>) operation.getExtensions().get("x-permissions");
                assertThat(extension.get("logic")).isEqualTo(required.logic().name());
                assertThat((List<String>) extension.get("codes")).containsExactlyElementsOf(java.util.Arrays.stream(required.codes()).sorted().toList());
            }
        }
        return Set.copyOf(consumed);
    }

    @RestController @RequestMapping("/api/protected") static class MissingPermissionController {
        @org.springframework.web.bind.annotation.GetMapping void missing() {}
    }
    @RestController @RequestMapping("/api/protected") static class UnknownPermissionController {
        @org.springframework.web.bind.annotation.GetMapping @RequiresPermissions(codes = "unknown:thing:view") void unknown() {}
    }
}
