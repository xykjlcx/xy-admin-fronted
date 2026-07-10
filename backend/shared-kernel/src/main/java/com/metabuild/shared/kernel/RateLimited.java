package com.metabuild.shared.kernel;

/**
 * 可映射为 HTTP 429 的领域异常。
 */
public final class RateLimited extends DomainException {

    public RateLimited(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }
}
