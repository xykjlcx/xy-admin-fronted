package com.metabuild.shared.kernel;

/** 可映射为 HTTP 503 的领域异常。 */
public class ServiceUnavailable extends DomainException {
    public ServiceUnavailable(ErrorCode errorCode, String message) { super(errorCode, message); }
}
