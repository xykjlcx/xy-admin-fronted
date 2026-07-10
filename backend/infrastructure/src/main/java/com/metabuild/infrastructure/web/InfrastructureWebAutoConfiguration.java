package com.metabuild.infrastructure.web;

import com.metabuild.infrastructure.exception.GlobalExceptionHandler;
import com.metabuild.infrastructure.observability.TraceIdFilter;
import com.metabuild.infrastructure.security.SecurityHeadersFilter;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

/**
 * MetaBuilder Web 基线自动装配。
 */
@AutoConfiguration
@Import(GlobalExceptionHandler.class)
public class InfrastructureWebAutoConfiguration {

    @Bean
    TraceIdFilter traceIdFilter() {
        return new TraceIdFilter();
    }

    @Bean
    SecurityHeadersFilter securityHeadersFilter() {
        return new SecurityHeadersFilter();
    }
}
