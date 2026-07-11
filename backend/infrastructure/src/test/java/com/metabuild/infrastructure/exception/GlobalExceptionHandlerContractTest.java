package com.metabuild.infrastructure.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.metabuild.shared.kernel.BadRequest;
import com.metabuild.shared.kernel.Conflict;
import com.metabuild.shared.kernel.DomainException;
import com.metabuild.shared.kernel.Forbidden;
import com.metabuild.shared.kernel.NotFound;
import com.metabuild.shared.kernel.RateLimited;
import com.metabuild.shared.kernel.Unauthorized;
import com.metabuild.shared.kernel.ServiceUnavailable;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.ExceptionHandler;

class GlobalExceptionHandlerContractTest {

    @Test
    void domainHandlersDeclareOnlyTheSixSupportedDomainExceptions() {
        Set<Class<?>> declaredDomainTypes = Arrays.stream(GlobalExceptionHandler.class.getDeclaredMethods())
                .map(method -> method.getAnnotation(ExceptionHandler.class))
                .filter(java.util.Objects::nonNull)
                .flatMap(annotation -> Arrays.stream(annotation.value()))
                .filter(DomainException.class::isAssignableFrom)
                .collect(Collectors.toSet());

        assertEquals(
                Set.of(BadRequest.class, Unauthorized.class, Forbidden.class,
                        NotFound.class, Conflict.class, RateLimited.class, ServiceUnavailable.class),
                declaredDomainTypes);
    }
}
