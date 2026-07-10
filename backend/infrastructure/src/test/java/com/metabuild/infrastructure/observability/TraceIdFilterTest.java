package com.metabuild.infrastructure.observability;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class TraceIdFilterTest {

    @Test
    void restoresPreviousMdcTraceIdAfterRequest() throws Exception {
        String previousTraceId = "outer-trace-id";
        MDC.put("traceId", previousTraceId);
        try {
            MockHttpServletRequest request = new MockHttpServletRequest();
            MockHttpServletResponse response = new MockHttpServletResponse();

            new TraceIdFilter().doFilter(request, response, (servletRequest, servletResponse) -> {
                String requestTraceId = MDC.get("traceId");
                assertNotNull(requestTraceId);
                assertNotEquals(previousTraceId, requestTraceId);
            });

            assertEquals(previousTraceId, MDC.get("traceId"));
        } finally {
            MDC.remove("traceId");
        }
    }
}
