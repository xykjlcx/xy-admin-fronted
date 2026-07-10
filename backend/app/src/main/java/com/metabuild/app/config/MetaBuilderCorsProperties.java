package com.metabuild.app.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("metabuilder.cors")
public record MetaBuilderCorsProperties(List<String> allowedOrigins) {

  public MetaBuilderCorsProperties {
    allowedOrigins = allowedOrigins == null
        ? List.of()
        : allowedOrigins.stream()
            .map(String::trim)
            .filter(origin -> !origin.isEmpty())
            .toList();
  }
}
