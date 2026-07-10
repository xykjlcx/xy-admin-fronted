package com.metabuild.shared.kernel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;

import java.util.List;
import org.junit.jupiter.api.Test;

class DomainHttpExceptionTest {

    private static final ErrorCode ERROR_CODE = () -> "test.domain-error";

    @Test
    void exposesStableCodeAndMessageAcrossHttpSemanticSubclasses() {
        List<DomainException> exceptions = List.of(
                new BadRequest(ERROR_CODE, "bad request"),
                new Unauthorized(ERROR_CODE, "unauthorized"),
                new Forbidden(ERROR_CODE, "forbidden"),
                new NotFound(ERROR_CODE, "not found"),
                new Conflict(ERROR_CODE, "conflict"),
                new RateLimited(ERROR_CODE, "rate limited"));

        for (DomainException exception : exceptions) {
            assertInstanceOf(DomainException.class, exception);
            assertEquals(ERROR_CODE, exception.errorCode());
        }
        assertEquals(
                List.of("bad request", "unauthorized", "forbidden", "not found", "conflict", "rate limited"),
                exceptions.stream().map(Throwable::getMessage).toList());
    }
}
