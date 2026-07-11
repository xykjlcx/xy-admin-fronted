package com.metabuild.api.contract.permissions;

import com.metabuild.admin.api.security.PermissionRequirementResolver;
import java.lang.reflect.Method;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public final class PermissionOperationExtension {
    private PermissionOperationExtension() {}

    public static Optional<Map<String, Object>> from(Method method) {
        var permission = PermissionRequirementResolver.resolve(method);
        if (permission.isEmpty()) return Optional.empty();
        List<String> codes = permission.orElseThrow().codes();
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("logic", permission.orElseThrow().logic().name());
        value.put("codes", codes);
        return Optional.of(Map.of("x-permissions", value));
    }
}
