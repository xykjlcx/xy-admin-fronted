package com.metabuild.api.contract.permissions;

import com.metabuild.admin.api.security.RequiresPermissions;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public final class PermissionOperationExtension {
    private PermissionOperationExtension() {}

    public static Optional<Map<String, Object>> from(Method method) {
        RequiresPermissions permission = method.getAnnotation(RequiresPermissions.class);
        if (permission == null) return Optional.empty();
        if (permission.codes().length == 0) throw new IllegalArgumentException("Permission codes must not be empty");
        List<String> codes = Arrays.stream(permission.codes()).sorted().toList();
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("logic", permission.logic().name());
        value.put("codes", codes);
        return Optional.of(Map.of("x-permissions", value));
    }
}
