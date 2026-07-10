package com.metabuild.shared.kernel;

/**
 * 可映射为 HTTP 403 的领域异常。
 */
public final class Forbidden extends DomainException {

    public Forbidden(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }
}
