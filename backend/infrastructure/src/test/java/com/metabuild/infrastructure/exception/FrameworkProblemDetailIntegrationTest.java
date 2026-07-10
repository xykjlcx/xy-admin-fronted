package com.metabuild.infrastructure.exception;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

@SpringBootTest(
        classes = FrameworkProblemDetailIntegrationTest.TestApplication.class,
        properties = "logging.level.com.metabuild.infrastructure.exception.GlobalExceptionHandler=OFF")
@AutoConfigureMockMvc
class FrameworkProblemDetailIntegrationTest {

    private final MockMvc mockMvc;

    @Autowired
    FrameworkProblemDetailIntegrationTest(MockMvc mockMvc) {
        this.mockMvc = mockMvc;
    }

    @Test
    void mapsBeanValidationFailure() throws Exception {
        expectProblem(
                mockMvc.perform(post("/test/body")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}")),
                400,
                "request.validation.failed");
    }

    @Test
    void mapsMalformedJson() throws Exception {
        expectProblem(
                mockMvc.perform(post("/test/body")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":")),
                400,
                "request.malformed");
    }

    @Test
    void localizesProblemDetailInSimplifiedChinese() throws Exception {
        mockMvc.perform(post("/test/body")
                        .header(HttpHeaders.ACCEPT_LANGUAGE, "zh-CN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":"))
                .andExpect(jsonPath("$.detail").value("请求体格式错误"));
    }

    @Test
    void localizesProblemDetailInAmericanEnglish() throws Exception {
        mockMvc.perform(post("/test/body")
                        .header(HttpHeaders.ACCEPT_LANGUAGE, "en-US")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":"))
                .andExpect(jsonPath("$.detail").value("Malformed request body"));
    }

    @Test
    void mapsPathTypeMismatch() throws Exception {
        expectProblem(
                mockMvc.perform(get("/test/number/not-a-number")),
                400,
                "request.type-mismatch");
    }

    @Test
    void mapsMissingQueryParameter() throws Exception {
        expectProblem(
                mockMvc.perform(get("/test/required-param")),
                400,
                "request.parameter.missing");
    }

    @Test
    void mapsMissingMultipartPart() throws Exception {
        expectProblem(
                mockMvc.perform(multipart("/test/required-part")),
                400,
                "request.multipart.missing");
    }

    @Test
    void mapsUploadTooLarge() throws Exception {
        expectProblem(
                mockMvc.perform(get("/test/upload-too-large")),
                413,
                "request.upload.too-large");
    }

    @Test
    void mapsMethodNotAllowed() throws Exception {
        expectProblem(
                mockMvc.perform(post("/test/get-only")),
                405,
                "request.method.not-allowed");
    }

    @Test
    void mapsUnsupportedMediaType() throws Exception {
        expectProblem(
                mockMvc.perform(post("/test/body")
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("name")),
                415,
                "request.media-type.unsupported");
    }

    @Test
    void mapsUnknownExceptionWithoutLeakingItsMessage() throws Exception {
        mockMvc.perform(get("/test/unknown"))
                .andExpectAll(
                        status().isInternalServerError(),
                        content().contentType(MediaType.APPLICATION_PROBLEM_JSON),
                        jsonPath("$.status").value(500),
                        jsonPath("$.code").value("internal.server-error"),
                        jsonPath("$.traceId").value(Matchers.matchesPattern("[0-9a-f]{32}")),
                        header().string("X-Trace-Id", Matchers.matchesPattern("[0-9a-f]{32}")),
                        content().string(not(containsString("sensitive database detail"))));
    }

    @Test
    void addsBaselineSecurityHeaders() throws Exception {
        mockMvc.perform(get("/test/get-only"))
                .andExpectAll(
                        header().string("X-Content-Type-Options", "nosniff"),
                        header().string("X-Frame-Options", "DENY"),
                        header().string(
                                "Content-Security-Policy",
                                "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'"),
                        header().string("Referrer-Policy", "strict-origin-when-cross-origin"));
    }

    @Test
    void doesNotTurnMissingResourceIntoGenericServerError() throws Exception {
        expectProblem(
                mockMvc.perform(get("/test/does-not-exist")),
                404,
                "request.resource.not-found");
    }

    private void expectProblem(ResultActions result, int expectedStatus, String expectedCode) throws Exception {
        result.andExpectAll(
                status().is(expectedStatus),
                content().contentType(MediaType.APPLICATION_PROBLEM_JSON),
                jsonPath("$.status").value(expectedStatus),
                jsonPath("$.code").value(expectedCode),
                jsonPath("$.traceId").value(Matchers.matchesPattern("[0-9a-f]{32}")),
                header().string("X-Trace-Id", Matchers.matchesPattern("[0-9a-f]{32}")));
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import(FrameworkExceptionFixtureController.class)
    static class TestApplication {}

    @RestController
    static class FrameworkExceptionFixtureController {

        @PostMapping(path = "/test/body", consumes = MediaType.APPLICATION_JSON_VALUE)
        Map<String, String> body(@Valid @RequestBody ValidationRequest request) {
            return Map.of("name", request.name());
        }

        @GetMapping("/test/number/{value}")
        int number(@PathVariable int value) {
            return value;
        }

        @GetMapping("/test/required-param")
        String requiredParam(@RequestParam String value) {
            return value;
        }

        @PostMapping(path = "/test/required-part", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
        String requiredPart(@RequestPart("file") MultipartFile file) {
            return file.getOriginalFilename();
        }

        @GetMapping("/test/upload-too-large")
        void uploadTooLarge() {
            throw new MaxUploadSizeExceededException(1);
        }

        @GetMapping("/test/get-only")
        void getOnly() {}

        @GetMapping("/test/unknown")
        void unknown() {
            throw new IllegalStateException("sensitive database detail");
        }
    }

    record ValidationRequest(@NotBlank String name) {}
}
