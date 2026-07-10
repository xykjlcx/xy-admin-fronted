package com.metabuilder.shared.kernel;

import java.util.Objects;

/**
 * 可映射为稳定错误码的领域异常基类。
 */
public abstract class DomainException extends RuntimeException {

    private final ErrorCode errorCode;

    protected DomainException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = Objects.requireNonNull(errorCode, "errorCode must not be null");
    }

    public final ErrorCode errorCode() {
        return errorCode;
    }
}
