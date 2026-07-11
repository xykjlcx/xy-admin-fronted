package com.metabuild.admin.api.security;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/** Runtime、OpenAPI 与覆盖检查共用的权限声明解析器。 */
public final class PermissionRequirementResolver {
    private PermissionRequirementResolver() {}

    public static Optional<Requirement> resolve(Method method) {
        RequiresPermissions annotation = method.getAnnotation(RequiresPermissions.class);
        if (annotation == null) return Optional.empty();
        List<String> codes = Arrays.stream(annotation.codes())
                .map(String::trim)
                .filter(code -> !code.isEmpty())
                .distinct()
                .sorted()
                .toList();
        if (codes.isEmpty() || codes.size() != annotation.codes().length) {
            throw new IllegalArgumentException("Permission codes must be non-empty and unique");
        }
        return Optional.of(new Requirement(annotation.logic(), codes));
    }

    public record Requirement(PermissionLogic logic, List<String> codes) {}
}
