package com.metabuild.app.security;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.metabuild.infrastructure.exception.GlobalExceptionHandler;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.StaticMessageSource;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class RedisUnavailableHttpIntegrationTest {
    @Test void redisConnectionFailureBecomesStable503ProblemDetail() throws Exception {
        var redis = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked") var values = (ValueOperations<String,String>) mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        when(values.get(org.mockito.ArgumentMatchers.anyString()))
                .thenThrow(new RedisConnectionFailureException("down"));
        var store = new RedisAuthorizationSnapshotStore(redis, new ObjectMapper().findAndRegisterModules());
        var messages = new StaticMessageSource();
        messages.addMessage("auth.authorization-unavailable", java.util.Locale.ENGLISH, "Authorization unavailable");
        var mvc = MockMvcBuilders.standaloneSetup(new Probe(store))
                .setControllerAdvice(new GlobalExceptionHandler(messages)).build();
        mvc.perform(get("/probe"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("auth.authorization-unavailable"));
    }
    @org.springframework.web.bind.annotation.RestController
    static class Probe {
        private final RedisAuthorizationSnapshotStore store;
        Probe(RedisAuthorizationSnapshotStore store) { this.store=store; }
        @org.springframework.web.bind.annotation.GetMapping("/probe") Object probe() {
            return store.load(UUID.fromString("01900000-0000-7000-8000-000000000001"));
        }
    }
}
