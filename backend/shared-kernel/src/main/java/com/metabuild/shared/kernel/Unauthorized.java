package com.metabuild.shared.kernel;

/**
 * 可映射为 HTTP 401 的领域异常。
 */
public class Unauthorized extends DomainException {

    public Unauthorized(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }
}
