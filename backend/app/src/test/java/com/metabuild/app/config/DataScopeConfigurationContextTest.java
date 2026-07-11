package com.metabuild.app.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.metabuild.app.security.RequestAuthorizationContext;
import com.metabuild.infrastructure.jooq.DataScopeRegistry;
import com.metabuild.infrastructure.jooq.DataScopeRegistryVerifier;
import com.metabuild.infrastructure.jooq.DataScopeVisitListener;
import com.metabuild.modules.admin.auth.application.AccountSessionPort;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.List;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.JdbcTemplateAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceTransactionManagerAutoConfiguration;
import org.springframework.boot.autoconfigure.jooq.JooqAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.junit.jupiter.api.Test;

class DataScopeConfigurationContextTest {
    @Test void managedDslContextContainsDataScopeListenerAndVerifiedRegistry() {
        new ApplicationContextRunner()
                .withConfiguration(AutoConfigurations.of(DataSourceAutoConfiguration.class, JdbcTemplateAutoConfiguration.class,
                        DataSourceTransactionManagerAutoConfiguration.class,JooqAutoConfiguration.class))
                .withUserConfiguration(DataScopeConfiguration.class)
                .withPropertyValues(
                        "spring.datasource.url=jdbc:postgresql://127.0.0.1:5432/postgres",
                        "spring.datasource.username=" + System.getProperty("user.name"),
                        "spring.datasource.driver-class-name=org.postgresql.Driver",
                        "metabuilder.data-scope.system-principal-id=01900000-0000-7000-8000-000000000011")
                .withBean(AccountSessionPort.class, () -> mock(AccountSessionPort.class))
                .withBean(RequestAuthorizationContext.class, () -> mock(RequestAuthorizationContext.class))
                .withBean(SimpleMeterRegistry.class, SimpleMeterRegistry::new)
                .withBean(com.metabuild.infrastructure.security.SaTokenSessionControl.class,
                        com.metabuild.infrastructure.security.SaTokenSessionControl::new)
                .withBean(com.metabuild.shared.kernel.UuidV7Generator.class,
                        com.metabuild.shared.kernel.UuidV7Generator::new)
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasSingleBean(DataScopeRegistryVerifier.class);
                    DSLContext dsl = context.getBean(DSLContext.class);
                    assertThat(dsl.configuration().visitListenerProviders()).isNotEmpty();
                    assertThat(dsl.configuration().visitListenerProviders()[0].provide())
                            .isInstanceOf(DataScopeVisitListener.class);
                });
    }

    @Test void missingGeneratedTableRegistrationFailsSpringStartup() {
        var generated = DSL.table("new_business_table");
        var registry = new DataScopeRegistry(List.of());
        new ApplicationContextRunner()
                .withBean(DataScopeRegistry.class, () -> registry)
                .withBean(DataScopeRegistryVerifier.class, () -> new DataScopeRegistryVerifier(
                        registry, List.of(generated)))
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure()).hasRootCauseMessage(
                            "Generated table is absent from DataScopeRegistry: new_business_table");
                });
    }
}
