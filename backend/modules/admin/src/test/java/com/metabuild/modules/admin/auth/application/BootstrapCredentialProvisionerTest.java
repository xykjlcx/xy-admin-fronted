package com.metabuild.modules.admin.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class BootstrapCredentialProvisionerTest {
    @Test
    void initializesSentinelOnceAndNeverOverwritesExistingHash() {
        var value = new AtomicReference<>(BootstrapCredentialProvisioner.SENTINEL);
        BootstrapCredentialRepository repository = (expected, replacement) -> value.compareAndSet(expected, replacement);
        var provisioner = new BootstrapCredentialProvisioner(repository, raw -> "hash:" + raw);

        assertThat(provisioner.provision("secret", false)).isTrue();
        assertThat(value).hasValue("hash:secret");
        assertThat(provisioner.provision("wrong", false)).isFalse();
        assertThat(value).hasValue("hash:secret");
    }

    @Test
    void productionWithoutSecretFailsFastButDevelopmentMayLeaveSentinel() {
        var provisioner = new BootstrapCredentialProvisioner((a, b) -> false, raw -> "hash:" + raw);
        assertThatThrownBy(() -> provisioner.provision("", true)).isInstanceOf(IllegalStateException.class);
        assertThat(provisioner.provision("", false)).isFalse();
    }
}
