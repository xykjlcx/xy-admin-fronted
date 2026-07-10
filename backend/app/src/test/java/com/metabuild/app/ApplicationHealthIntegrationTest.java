package com.metabuild.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Map;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.context.WebServerApplicationContext;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

class ApplicationHealthIntegrationTest {

  private static final String VALID_SECRET = "0123456789abcdef0123456789abcdef";
  private static final String ALLOWED_ORIGIN = "https://console.example";
  private static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine");
  private static final GenericContainer<?> REDIS = new GenericContainer<>(
      DockerImageName.parse("redis:7-alpine")).withExposedPorts(6379);
  private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
      .connectTimeout(Duration.ofSeconds(2))
      .build();

  @BeforeAll
  static void startDependencies() {
    POSTGRES.start();
    REDIS.start();
  }

  @AfterAll
  static void stopDependencies() {
    if (REDIS.isRunning()) {
      REDIS.stop();
    }
    if (POSTGRES.isRunning()) {
      POSTGRES.stop();
    }
  }

  @Test
  void servesHealthAndKeepsCorsScopedToApi() throws Exception {
    verifyConfiguredCorsOrigin();

    try (var context = start(Map.of())) {
      int port = ((WebServerApplicationContext) context).getWebServer().getPort();

      HttpResponse<String> defaultCorsResponse = get(port, "/api/cors-probe", ALLOWED_ORIGIN);
      assertThat(defaultCorsResponse.headers().firstValue("Access-Control-Allow-Origin"))
          .isEmpty();

      JsonNode initialLiveness = health(port, "liveness");
      JsonNode initialReadiness = health(port, "readiness");
      assertThat(initialLiveness.path("status").asText()).isEqualTo("UP");
      assertThat(componentNames(initialLiveness)).containsExactly("livenessState");
      assertThat(initialReadiness.path("status").asText()).isEqualTo("UP");
      assertThat(componentNames(initialReadiness))
          .containsExactlyInAnyOrder("db", "readinessState", "redis");
    }
  }

  @ParameterizedTest
  @ValueSource(strings = {
      "*",
      "https://*.example.com",
      "ftp://example.com",
      "https://user@example.com",
      "https://example.com/path",
      "https://example.com?debug=true",
      "https://example.com#fragment",
      "https:///missing-host"
  })
  void realApplicationRejectsUnsafeCorsOrigins(String origin) {
    Throwable failure = null;
    try (var ignored = start(Map.of("metabuilder.cors.allowed-origins", origin))) {
      // 启动成功即为契约失败，由后续断言统一报告。
    } catch (Throwable caught) {
      failure = caught;
    }

    assertThat(failure)
        .isNotNull()
        .hasRootCauseMessage(
            "METABUILDER_CORS_ALLOWED_ORIGINS must contain only explicit HTTP(S) origins");
  }

  private void verifyConfiguredCorsOrigin() throws Exception {
    try (var context = start(Map.of(
        "metabuilder.cors.allowed-origins", ALLOWED_ORIGIN))) {
      int port = ((WebServerApplicationContext) context).getWebServer().getPort();
      HttpResponse<String> response = get(port, "/api/cors-probe", ALLOWED_ORIGIN);

      assertThat(response.statusCode()).isEqualTo(200);
      assertThat(response.headers().firstValue("Access-Control-Allow-Origin"))
          .contains(ALLOWED_ORIGIN);

      HttpResponse<String> actuatorResponse =
          get(port, "/actuator/health/liveness", ALLOWED_ORIGIN);
      assertThat(actuatorResponse.headers().firstValue("Access-Control-Allow-Origin"))
          .isEmpty();
    }
  }

  private org.springframework.context.ConfigurableApplicationContext start(
      Map<String, Object> extraProperties) {
    var arguments = new ArrayList<String>();
    arguments.add("--server.port=0");
    arguments.add("--metabuilder.auth.token-secret=" + VALID_SECRET);
    arguments.add("--spring.datasource.url=" + POSTGRES.getJdbcUrl());
    arguments.add("--spring.datasource.username=" + POSTGRES.getUsername());
    arguments.add("--spring.datasource.password=" + POSTGRES.getPassword());
    arguments.add("--spring.datasource.hikari.connection-timeout=500");
    arguments.add("--spring.datasource.hikari.validation-timeout=500");
    arguments.add("--spring.data.redis.host=" + REDIS.getHost());
    arguments.add("--spring.data.redis.port=" + REDIS.getMappedPort(6379));
    arguments.add("--spring.data.redis.connect-timeout=500ms");
    arguments.add("--spring.data.redis.timeout=500ms");
    arguments.add("--spring.main.banner-mode=off");
    arguments.add("--logging.level.root=OFF");
    extraProperties.forEach((key, value) -> arguments.add("--" + key + "=" + value));

    return new SpringApplicationBuilder(MetaBuilderApplication.class)
        .web(WebApplicationType.SERVLET)
        .run(arguments.toArray(String[]::new));
  }

  private JsonNode health(int port, String group) throws Exception {
    HttpResponse<String> response = get(port, "/actuator/health/" + group, null);
    return new ObjectMapper().readTree(response.body());
  }

  private HttpResponse<String> get(int port, String path, String origin) throws Exception {
    HttpRequest.Builder request = HttpRequest.newBuilder()
        .uri(URI.create("http://127.0.0.1:" + port + path))
        .timeout(Duration.ofSeconds(5))
        .GET();
    if (origin != null) {
      request.header("Origin", origin);
    }
    return HTTP_CLIENT.send(request.build(), HttpResponse.BodyHandlers.ofString());
  }

  private java.util.List<String> componentNames(JsonNode health) {
    var names = new ArrayList<String>();
    health.path("components").fieldNames().forEachRemaining(names::add);
    return names;
  }
}
