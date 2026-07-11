package com.metabuild.infrastructure.jooq;

@FunctionalInterface
public interface DataScopeMetrics {
    void failClosed(String reason);

    DataScopeMetrics NOOP = reason -> { };
}
