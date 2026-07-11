package com.metabuild.infrastructure.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class SaTokenSessionControlCompensationTest {
    @Test
    void failedSecondLoginCompensatesOnlyItsNewToken() {
        var control = new FaultyControl();
        assertEquals("token-a", control.login("user").value());
        control.failAfterCreate = true;

        assertThrows(IllegalStateException.class, () -> control.login("user"));

        assertEquals(List.of("token-a"), control.active);
        assertEquals(List.of("token-b"), control.loggedOut);
    }

    private static final class FaultyControl extends SaTokenSessionControl {
        private final List<String> active = new ArrayList<>();
        private final List<String> loggedOut = new ArrayList<>();
        private boolean failAfterCreate;
        @Override protected String createLoginSession(String userId) {
            String token = active.isEmpty() ? "token-a" : "token-b";
            active.add(token);
            return token;
        }
        @Override protected long tokenTimeout(String token) { return 1800; }
        @Override protected void afterLoginSessionCreated(String token) {
            if (failAfterCreate) throw new IllegalStateException("injected post-create failure");
        }
        @Override public void logoutToken(String token) { loggedOut.add(token); active.remove(token); }
    }
}
