package com.metabuild.infrastructure.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.metabuild.shared.kernel.Conflict;
import jakarta.servlet.Filter;
import jakarta.servlet.http.HttpServletResponse;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootTest(classes = FilterOrderingIntegrationTest.TestApplication.class)
@AutoConfigureMockMvc
class FilterOrderingIntegrationTest {

    private static final String CONTENT_SECURITY_POLICY =
            "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'";

    private final MockMvc mockMvc;
    private final ObjectMapper objectMapper;

    @Autowired
    FilterOrderingIntegrationTest(MockMvc mockMvc, ObjectMapper objectMapper) {
        this.mockMvc = mockMvc;
        this.objectMapper = objectMapper;
    }

    @Test
    void traceAndSecurityHeadersRunBeforeDownstreamShortCircuitFilter() throws Exception {
        mockMvc.perform(get("/test/short-circuit"))
                .andExpectAll(
                        status().isIAmATeapot(),
                        header().string("X-Trace-Id", Matchers.matchesPattern("[0-9a-f]{32}")),
                        header().string("X-Content-Type-Options", "nosniff"),
                        header().string("X-Frame-Options", "DENY"),
                        header().string("Content-Security-Policy", CONTENT_SECURITY_POLICY),
                        header().string("Referrer-Policy", "strict-origin-when-cross-origin"));
    }

    @Test
    void handledErrorsKeepMatchingTraceIdAndSecurityHeaders() throws Exception {
        MvcResult result = mockMvc.perform(get("/test/filter-error"))
                .andExpectAll(
                        status().isConflict(),
                        content().contentType(MediaType.APPLICATION_PROBLEM_JSON),
                        jsonPath("$.code").value("test.filter-conflict"),
                        header().string("X-Trace-Id", Matchers.matchesPattern("[0-9a-f]{32}")),
                        header().string("X-Content-Type-Options", "nosniff"),
                        header().string("X-Frame-Options", "DENY"),
                        header().string("Content-Security-Policy", CONTENT_SECURITY_POLICY),
                        header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andReturn();

        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsByteArray());
        assertEquals(result.getResponse().getHeader("X-Trace-Id"), body.path("traceId").asText());
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import({FilterFixtureController.class, ShortCircuitConfiguration.class})
    static class TestApplication {}

    static class ShortCircuitConfiguration {

        @Bean
        FilterRegistrationBean<Filter> downstreamShortCircuitFilter() {
            Filter filter = (request, response, chain) ->
                    ((HttpServletResponse) response).setStatus(418);
            FilterRegistrationBean<Filter> registration = new FilterRegistrationBean<>(filter);
            registration.setOrder(0);
            registration.addUrlPatterns("/test/short-circuit");
            return registration;
        }
    }

    @RestController
    static class FilterFixtureController {

        @GetMapping("/test/filter-error")
        void error() {
            throw new Conflict(() -> "test.filter-conflict", "filter conflict");
        }
    }
}
