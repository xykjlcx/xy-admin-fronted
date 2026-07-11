package com.metabuild.api.contract.permissions;

import io.swagger.v3.oas.models.Operation;
import org.springdoc.core.customizers.OperationCustomizer;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;

@Component
public final class PermissionOperationCustomizer implements OperationCustomizer {
    @Override
    public Operation customize(Operation operation, HandlerMethod handlerMethod) {
        PermissionOperationExtension.from(handlerMethod.getMethod()).ifPresent(extension ->
                operation.addExtension("x-permissions", extension.get("x-permissions")));
        return operation;
    }
}
