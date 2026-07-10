package com.metabuild.infrastructure.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootTest(classes = SuccessResponseFixtureIntegrationTest.TestApplication.class)
@AutoConfigureMockMvc
class SuccessResponseFixtureIntegrationTest {

    private final MockMvc mockMvc;

    @Autowired
    SuccessResponseFixtureIntegrationTest(MockMvc mockMvc) {
        this.mockMvc = mockMvc;
    }

    @Test
    void returnsJsonObjectWithoutEnvelope() throws Exception {
        mockMvc.perform(get("/test/success/json"))
                .andExpectAll(
                        status().isOk(),
                        content().contentType(MediaType.APPLICATION_JSON),
                        jsonPath("$.value").value("ok"),
                        jsonPath("$.data").doesNotExist());
    }

    @Test
    void returnsNoContentWithoutBody() throws Exception {
        mockMvc.perform(get("/test/success/void"))
                .andExpectAll(
                        status().isNoContent(),
                        content().string(""));
    }

    @Test
    void returnsBlobWithMediaTypeAndFilename() throws Exception {
        mockMvc.perform(get("/test/success/blob"))
                .andExpectAll(
                        status().isOk(),
                        content().contentType(MediaType.APPLICATION_OCTET_STREAM),
                        header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=fixture.bin"),
                        content().bytes(new byte[] {0x01, 0x02, 0x03}));
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import(SuccessFixtureController.class)
    static class TestApplication {}

    @RestController
    static class SuccessFixtureController {

        @GetMapping(path = "/test/success/json", produces = MediaType.APPLICATION_JSON_VALUE)
        Map<String, String> json() {
            return Map.of("value", "ok");
        }

        @GetMapping("/test/success/void")
        ResponseEntity<Void> noContent() {
            return ResponseEntity.noContent().build();
        }

        @GetMapping(path = "/test/success/blob", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
        ResponseEntity<byte[]> blob() {
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=fixture.bin")
                    .body(new byte[] {0x01, 0x02, 0x03});
        }
    }
}
