package com.metabuild.infrastructure.jooq;

@FunctionalInterface
public interface DataScopeAccessProvider {
    DataScopeAccess current();
}
