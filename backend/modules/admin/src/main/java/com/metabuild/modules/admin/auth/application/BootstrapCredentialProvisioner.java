package com.metabuild.modules.admin.auth.application;

public final class BootstrapCredentialProvisioner {
    public static final String SENTINEL = "!bootstrap-credential-unset!";
    private final BootstrapCredentialRepository repository;
    private final PasswordHasher hasher;

    public BootstrapCredentialProvisioner(BootstrapCredentialRepository repository, PasswordHasher hasher) {
        this.repository = repository; this.hasher = hasher;
    }

    public boolean provision(String secret, boolean production) {
        if (secret == null || secret.isBlank()) {
            if (production) throw new IllegalStateException("METABUILDER_BOOTSTRAP_ADMIN_PASSWORD must be configured");
            return false;
        }
        return repository.compareAndSet(SENTINEL, hasher.hash(secret));
    }
}
