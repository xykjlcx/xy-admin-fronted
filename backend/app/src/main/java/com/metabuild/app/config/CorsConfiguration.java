package com.metabuild.app.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration(proxyBeanMethods = false)
public class CorsConfiguration {

  @Bean
  WebMvcConfigurer metaBuilderCorsConfigurer(MetaBuilderCorsProperties properties) {
    return new WebMvcConfigurer() {
      @Override
      public void addCorsMappings(CorsRegistry registry) {
        if (properties.allowedOrigins().isEmpty()) {
          return;
        }
        registry.addMapping("/api/**")
            .allowedOrigins(properties.allowedOrigins().toArray(String[]::new))
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .allowedHeaders("Authorization", "Content-Type", "Accept-Language", "X-Trace-Id")
            .exposedHeaders("X-Trace-Id", "Content-Disposition")
            .maxAge(3600);
      }
    };
  }
}
