package com.metabuild.app.config;

import java.net.URI;
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
    if (allowedOrigins.stream().anyMatch(origin -> !isExplicitHttpOrigin(origin))) {
      throw new IllegalArgumentException(
          "METABUILDER_CORS_ALLOWED_ORIGINS must contain only explicit HTTP(S) origins");
    }
  }

  private static boolean isExplicitHttpOrigin(String origin) {
    if (origin.indexOf('*') >= 0) {
      return false;
    }
    try {
      URI uri = URI.create(origin);
      String scheme = uri.getScheme();
      int port = uri.getPort();
      return ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))
          && uri.getHost() != null
          && !uri.getHost().isBlank()
          && uri.getRawUserInfo() == null
          && (uri.getRawPath() == null || uri.getRawPath().isEmpty())
          && uri.getRawQuery() == null
          && uri.getRawFragment() == null
          && (port == -1 || port > 0 && port <= 65535);
    } catch (IllegalArgumentException invalidUri) {
      return false;
    }
  }
}
