package com.metabuild.shared.kernel;

/**
 * 可映射为 HTTP 404 的领域异常。
 */
public final class NotFound extends DomainException {

    public NotFound(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }
}
