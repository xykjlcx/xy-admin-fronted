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
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.context.WebServerApplicationContext;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

class ApplicationDependencyHealthIntegrationTest {

  private static final String VALID_SECRET = "0123456789abcdef0123456789abcdef";
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
  void keepsLivenessUpWhenRuntimeDependenciesGoDown() throws Exception {
    try (var context = start()) {
      int port = ((WebServerApplicationContext) context).getWebServer().getPort();

      JsonNode initialReadiness = health(port, "readiness");
      assertThat(initialReadiness.path("status").asText()).isEqualTo("UP");
      assertThat(componentStatus(initialReadiness, "db")).isEqualTo("UP");
      assertThat(componentStatus(initialReadiness, "redis")).isEqualTo("UP");

      REDIS.stop();
      JsonNode redisDown = awaitHealth(port, "readiness", "redis", "DOWN");
      assertThat(componentStatus(redisDown, "db")).isEqualTo("UP");
      assertThat(health(port, "liveness").path("status").asText()).isEqualTo("UP");

      POSTGRES.stop();
      JsonNode databaseDown = awaitHealth(port, "readiness", "db", "DOWN");
      assertThat(databaseDown.path("status").asText()).isEqualTo("DOWN");
      assertThat(health(port, "liveness").path("status").asText()).isEqualTo("UP");
    }
  }

  private org.springframework.context.ConfigurableApplicationContext start() {
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

    return new SpringApplicationBuilder(MetaBuilderApplication.class)
        .web(WebApplicationType.SERVLET)
        .run(arguments.toArray(String[]::new));
  }

  private JsonNode awaitHealth(int port, String group, String component, String expected)
      throws Exception {
    JsonNode latest = null;
    for (int attempt = 0; attempt < 40; attempt += 1) {
      latest = health(port, group);
      if (expected.equals(componentStatus(latest, component))) {
        return latest;
      }
      Thread.sleep(250);
    }
    throw new AssertionError(
        "Timed out waiting for " + group + "/" + component + "=" + expected + ": " + latest);
  }

  private JsonNode health(int port, String group) throws Exception {
    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create("http://127.0.0.1:" + port + "/actuator/health/" + group))
        .timeout(Duration.ofSeconds(5))
        .GET()
        .build();
    HttpResponse<String> response =
        HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
    return new ObjectMapper().readTree(response.body());
  }

  private String componentStatus(JsonNode health, String component) {
    return health.path("components").path(component).path("status").asText();
  }
}
