package com.metabuild.modules.admin.auth.controller;

import com.metabuild.modules.admin.auth.application.AccountSessionPort;
import com.metabuild.modules.admin.auth.application.AuthenticationService;
import com.metabuild.modules.admin.auth.application.CurrentUserQuery;
import com.metabuild.modules.admin.auth.application.RefreshTokenService;
import com.metabuild.shared.kernel.BadRequest;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/auth")
public final class AuthController {
    private final AuthenticationService authentication;
    private final RefreshTokenService refreshTokens;
    private final CurrentUserQuery currentUser;
    private final AccountSessionPort sessions;

    public AuthController(AuthenticationService authentication, RefreshTokenService refreshTokens,
            CurrentUserQuery currentUser, AccountSessionPort sessions) {
        this.authentication=authentication; this.refreshTokens=refreshTokens; this.currentUser=currentUser; this.sessions=sessions;
    }

    @PostMapping("/login") public TokenResponse login(@RequestBody LoginRequest request,HttpServletRequest httpRequest) {
        if (request.username() == null || request.username().isBlank() || request.password() == null || request.password().isBlank())
            throw new BadRequest(() -> "request.validation.failed", "Username and password are required");
        var result = authentication.login(request.username().trim(), request.password(),httpRequest.getRemoteAddr(),httpRequest.getHeader("User-Agent"));
        return new TokenResponse(result.accessToken(), result.refreshToken(), result.expiresInSeconds());
    }
    @PostMapping("/refresh") public TokenResponse refresh(@RequestBody RefreshRequest request) {
        if (request.refreshToken() == null || request.refreshToken().isBlank())
            throw new BadRequest(() -> "request.validation.failed", "Refresh token is required");
        var result = refreshTokens.rotateForAccess(request.refreshToken(),
                (userId, credentialRevision) -> sessions.login(userId, credentialRevision));
        return new TokenResponse(result.accessToken(), result.refreshToken(), result.expiresInSeconds());
    }
    @PostMapping("/logout") public ResponseEntity<Void> logout() {
        UUID userId = sessions.currentUserId();
        if (userId != null) authentication.logoutAll(userId);
        return ResponseEntity.noContent().build();
    }
    @GetMapping("/me") public MeResponse me() {
        var view = currentUser.load();
        var auth = view.authorization();
        return new MeResponse(new UserResponse(view.user().id(), view.user().name(), view.user().username()),
                auth.roles().stream().sorted().toList(), auth.permissions().stream().sorted().toList(), auth.systemAdmin(),
                new DataScopeResponse(auth.dataScope().all(), auth.dataScope().includeSelf(), auth.dataScope().deptIds()));
    }

    public record LoginRequest(String username, String password) {}
    public record RefreshRequest(String refreshToken) {}
    public record TokenResponse(String token, String refreshToken, long expiresInSeconds) {}
    public record UserResponse(UUID id, String name, String username) {}
    public record DataScopeResponse(boolean unrestricted, boolean self, Set<UUID> deptIds) {}
    public record MeResponse(UserResponse user, List<String> roles, List<String> permissions,
            boolean systemAdmin, DataScopeResponse dataScope) {}
}
