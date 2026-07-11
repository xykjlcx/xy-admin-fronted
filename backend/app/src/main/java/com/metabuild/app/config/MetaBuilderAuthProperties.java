package com.metabuild.app.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("metabuilder.auth")
public record MetaBuilderAuthProperties(String tokenSecret, String bootstrapAdminPassword, String deploymentMode) {

  public static final String EXAMPLE_TOKEN_SECRET = "__GENERATED__";

  public MetaBuilderAuthProperties {
    if (tokenSecret == null || tokenSecret.isBlank()) {
      throw new IllegalArgumentException("METABUILDER_AUTH_TOKEN_SECRET must be configured");
    }
    if (EXAMPLE_TOKEN_SECRET.equals(tokenSecret)) {
      throw new IllegalArgumentException(
          "METABUILDER_AUTH_TOKEN_SECRET must not use the example placeholder");
    }
    if (!"production".equals(deploymentMode) && !"development".equals(deploymentMode) && !"test".equals(deploymentMode)) {
      throw new IllegalArgumentException("METABUILDER_DEPLOYMENT_MODE must be explicitly configured");
    }
  }

  public boolean production() { return "production".equals(deploymentMode); }
}
