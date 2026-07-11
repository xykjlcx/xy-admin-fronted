package com.metabuild.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.metabuild.app.config.MetaBuilderAuthProperties;
import com.metabuild.app.config.MetaBuilderCorsProperties;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import com.metabuild.modules.admin.auth.application.BootstrapCredentialProvisioner;

class MetaBuilderConfigurationTest {

  private static final String VALID_SECRET = "0123456789abcdef0123456789abcdef";
  private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
      .withUserConfiguration(PropertiesConfiguration.class);

  @Test
  void refusesToStartWithoutAnAuthenticationSecret() {
    contextRunner.run(context -> assertThat(context)
        .hasFailed()
        .getFailure()
        .hasRootCauseMessage("METABUILDER_AUTH_TOKEN_SECRET must be configured"));
  }

  @Test
  void refusesToStartWithTheExampleAuthenticationSecret() {
    contextRunner
        .withPropertyValues("metabuilder.auth.token-secret=__GENERATED__")
        .run(context -> assertThat(context)
            .hasFailed()
            .getFailure()
            .hasRootCauseMessage(
                "METABUILDER_AUTH_TOKEN_SECRET must not use the example placeholder"));
  }

  @Test
  void bindsCorsOriginsAsAnEmptyListByDefault() throws Exception {
    contextRunner
        .withPropertyValues("metabuilder.auth.token-secret=" + VALID_SECRET, "metabuilder.auth.deployment-mode=test")
        .run(context -> assertThat(context.getBean(MetaBuilderCorsProperties.class).allowedOrigins())
            .isEqualTo(List.of()));
  }

  @Test
  void bindsConfiguredCorsOriginsAsAList() throws Exception {
    contextRunner
        .withPropertyValues(
            "metabuilder.auth.token-secret=" + VALID_SECRET,
            "metabuilder.auth.deployment-mode=test",
            "metabuilder.cors.allowed-origins=https://one.example,https://two.example")
        .run(context -> assertThat(context.getBean(MetaBuilderCorsProperties.class).allowedOrigins())
            .isEqualTo(List.of("https://one.example", "https://two.example")));
  }

  @Test
  void productionContextFailsWithoutBootstrapSecret() {
    new ApplicationContextRunner().withUserConfiguration(ProductionBootstrapConfiguration.class)
        .withPropertyValues(
            "metabuilder.auth.token-secret=" + VALID_SECRET,
            "metabuilder.auth.deployment-mode=production")
        .run(context -> assertThat(context).hasFailed()
            .getFailure().hasRootCauseMessage("METABUILDER_BOOTSTRAP_ADMIN_PASSWORD must be configured"));
  }

  @Configuration(proxyBeanMethods = false)
  @EnableConfigurationProperties({MetaBuilderAuthProperties.class, MetaBuilderCorsProperties.class})
  static class PropertiesConfiguration {
  }

  @Configuration(proxyBeanMethods = false)
  @EnableConfigurationProperties(MetaBuilderAuthProperties.class)
  static class ProductionBootstrapConfiguration {
    @Bean Object bootstrapGate(MetaBuilderAuthProperties properties) {
      new BootstrapCredentialProvisioner((a,b) -> false, value -> "hash")
          .provision(properties.bootstrapAdminPassword(), properties.production());
      return new Object();
    }
  }
}
