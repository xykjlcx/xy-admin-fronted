package com.metabuild.shared.kernel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

import org.junit.jupiter.api.Test;

class DomainExceptionTest {

    @Test
    void exposesStableErrorCodeAndMessage() {
        DomainException exception = new TestDomainException("conflict");

        assertSame(TestErrorCode.CONFLICT, exception.errorCode());
        assertEquals("test.conflict", exception.errorCode().code());
        assertEquals("conflict", exception.getMessage());
    }

    private enum TestErrorCode implements ErrorCode {
        CONFLICT;

        @Override
        public String code() {
            return "test.conflict";
        }
    }

    private static final class TestDomainException extends DomainException {

        private TestDomainException(String message) {
            super(TestErrorCode.CONFLICT, message);
        }
    }
}
