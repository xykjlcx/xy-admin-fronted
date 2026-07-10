package com.metabuild.shared.kernel;

/**
 * 可映射为 HTTP 400 的领域异常。
 */
public final class BadRequest extends DomainException {

    public BadRequest(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }
}
