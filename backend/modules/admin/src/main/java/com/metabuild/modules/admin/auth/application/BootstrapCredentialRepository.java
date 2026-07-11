package com.metabuild.modules.admin.auth.application;

@FunctionalInterface
public interface BootstrapCredentialRepository {
    boolean compareAndSet(String expectedHash, String replacementHash);
}
