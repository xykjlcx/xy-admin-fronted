package com.metabuild.shared.kernel;

/**
 * 可映射为 HTTP 409 的领域异常。
 */
public final class Conflict extends DomainException {

    public Conflict(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }
}
