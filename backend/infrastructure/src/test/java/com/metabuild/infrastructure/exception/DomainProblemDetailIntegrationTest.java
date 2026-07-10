package com.metabuild.infrastructure.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.metabuild.shared.kernel.BadRequest;
import com.metabuild.shared.kernel.Conflict;
import com.metabuild.shared.kernel.DomainException;
import com.metabuild.shared.kernel.ErrorCode;
import com.metabuild.shared.kernel.Forbidden;
import com.metabuild.shared.kernel.NotFound;
import com.metabuild.shared.kernel.RateLimited;
import com.metabuild.shared.kernel.Unauthorized;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@SpringBootTest(classes = DomainProblemDetailIntegrationTest.TestApplication.class)
@AutoConfigureMockMvc
class DomainProblemDetailIntegrationTest {

    private final MockMvc mockMvc;

    @Autowired
    DomainProblemDetailIntegrationTest(MockMvc mockMvc) {
        this.mockMvc = mockMvc;
    }

    @ParameterizedTest
    @CsvSource({
        "bad-request,400",
        "unauthorized,401",
        "forbidden,403",
        "not-found,404",
        "conflict,409",
        "rate-limited,429"
    })
    void mapsDomainExceptionToProblemDetail(String kind, int expectedStatus) throws Exception {
        mockMvc.perform(get("/test/domain/{kind}", kind))
                .andExpectAll(
                        status().is(expectedStatus),
                        content().contentType(MediaType.APPLICATION_PROBLEM_JSON),
                        jsonPath("$.status").value(expectedStatus),
                        jsonPath("$.code").value("test." + kind),
                        jsonPath("$.detail").value("detail " + kind),
                        jsonPath("$.traceId").value(org.hamcrest.Matchers.matchesPattern("[0-9a-f]{32}")),
                        header().string("X-Trace-Id", org.hamcrest.Matchers.matchesPattern("[0-9a-f]{32}")));
    }

    @Test
    void propagatesValidInboundTraceId() throws Exception {
        String traceId = "0123456789abcdef0123456789abcdef";

        mockMvc.perform(get("/test/domain/conflict").header("X-Trace-Id", traceId))
                .andExpectAll(
                        header().string("X-Trace-Id", traceId),
                        jsonPath("$.traceId").value(traceId));
    }

    @Test
    void replacesInvalidInboundTraceId() throws Exception {
        mockMvc.perform(get("/test/domain/conflict").header("X-Trace-Id", "user-controlled"))
                .andExpectAll(
                        header().string("X-Trace-Id", org.hamcrest.Matchers.matchesPattern("[0-9a-f]{32}")),
                        header().string("X-Trace-Id", org.hamcrest.Matchers.not("user-controlled")),
                        jsonPath("$.traceId").value(org.hamcrest.Matchers.matchesPattern("[0-9a-f]{32}")),
                        jsonPath("$.traceId").value(org.hamcrest.Matchers.not("user-controlled")));
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import(DomainExceptionFixtureController.class)
    static class TestApplication {}

    @RestController
    static class DomainExceptionFixtureController {

        @GetMapping("/test/domain/{kind}")
        void fail(@PathVariable String kind) {
            throw exception(kind);
        }

        private static DomainException exception(String kind) {
            ErrorCode errorCode = () -> "test." + kind;
            String detail = "detail " + kind;
            return switch (kind) {
                case "bad-request" -> new BadRequest(errorCode, detail);
                case "unauthorized" -> new Unauthorized(errorCode, detail);
                case "forbidden" -> new Forbidden(errorCode, detail);
                case "not-found" -> new NotFound(errorCode, detail);
                case "conflict" -> new Conflict(errorCode, detail);
                case "rate-limited" -> new RateLimited(errorCode, detail);
                default -> throw new IllegalArgumentException("Unknown fixture: " + kind);
            };
        }
    }
}
