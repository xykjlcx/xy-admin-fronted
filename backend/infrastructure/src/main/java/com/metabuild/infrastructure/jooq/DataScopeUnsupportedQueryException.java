package com.metabuild.infrastructure.jooq;

public final class DataScopeUnsupportedQueryException extends IllegalStateException {
    public DataScopeUnsupportedQueryException(String message) { super(message); }
}
