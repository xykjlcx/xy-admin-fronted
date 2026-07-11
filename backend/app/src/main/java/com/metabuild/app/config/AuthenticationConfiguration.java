package com.metabuild.app.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.metabuild.app.security.RedisAuthorizationSnapshotStore;
import com.metabuild.app.security.AccountSessionAdapter;
import com.metabuild.infrastructure.security.SaTokenSessionControl;
import com.metabuild.modules.admin.auth.application.AccountSessionPort;
import com.metabuild.modules.admin.auth.application.AuthenticationService;
import com.metabuild.modules.admin.auth.application.AuthorizationGraphRepository;
import com.metabuild.modules.admin.auth.application.AuthorizationSnapshotCompiler;
import com.metabuild.modules.admin.auth.application.AuthorizationSnapshotStore;
import com.metabuild.modules.admin.auth.application.AuthUserRepository;
import com.metabuild.modules.admin.auth.application.BootstrapCredentialProvisioner;
import com.metabuild.modules.admin.auth.application.RefreshTokenService;
import com.metabuild.modules.admin.auth.application.RefreshTokenStore;
import com.metabuild.modules.admin.auth.persistence.JdbcAuthorizationGraphRepository;
import com.metabuild.modules.admin.auth.persistence.JdbcAuthUserRepository;
import com.metabuild.modules.admin.auth.persistence.JdbcBootstrapCredentialRepository;
import com.metabuild.modules.admin.auth.persistence.JdbcRefreshTokenStore;
import com.metabuild.modules.admin.auth.persistence.JdbcLogoutRecoveryRepository;
import com.metabuild.modules.admin.auth.application.LogoutRecoveryPort;
import com.metabuild.modules.admin.auth.application.LogoutRecoveryHandler;
import com.metabuild.shared.kernel.UuidV7Generator;
import java.time.Clock;
import java.time.Duration;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.annotation.RequestScope;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import com.metabuild.app.security.RequestAuthorizationContext;
import com.metabuild.app.security.AuthorizationSnapshotInterceptor;
import com.metabuild.modules.admin.auth.application.RequestAuthorizationLoader;
import org.springframework.core.env.Environment;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration(proxyBeanMethods = false)
public class AuthenticationConfiguration {
    @Bean Clock authClock() { return Clock.systemUTC(); }
    @Bean UuidV7Generator authUuidGenerator() { return new UuidV7Generator(); }
    @Bean BCryptPasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }
    @Bean AuthUserRepository authUsers(JdbcTemplate jdbc) { return new JdbcAuthUserRepository(jdbc); }
    @Bean AuthorizationGraphRepository authorizationGraphs(JdbcTemplate jdbc) { return new JdbcAuthorizationGraphRepository(jdbc); }
    @Bean AuthorizationSnapshotCompiler authorizationSnapshotCompiler() { return new AuthorizationSnapshotCompiler(); }
    @Bean RedisAuthorizationSnapshotStore authorizationSnapshotStore(StringRedisTemplate redis, ObjectMapper json) {
        return new RedisAuthorizationSnapshotStore(redis, json);
    }
    @Bean SaTokenSessionControl saTokenSessionControl() { return new SaTokenSessionControl(); }
    @Bean AccountSessionPort accountSessions(SaTokenSessionControl sessions) { return new AccountSessionAdapter(sessions); }
    @Bean RefreshTokenStore refreshTokens(JdbcTemplate jdbc, PlatformTransactionManager transactions,
            UuidV7Generator ids, Clock clock) {
        return new JdbcRefreshTokenStore(jdbc, transactions, ids, clock, Duration.ofDays(7));
    }
    @Bean RefreshTokenService refreshTokenService(RefreshTokenStore tokens, AuthorizationSnapshotStore snapshots) {
        return new RefreshTokenService(tokens, snapshots);
    }
    @Bean AuthenticationService authenticationService(AuthUserRepository users, BCryptPasswordEncoder passwords,
            AuthorizationGraphRepository graphs, AuthorizationSnapshotCompiler compiler,
            AuthorizationSnapshotStore snapshots, AccountSessionPort sessions,
            RefreshTokenStore refreshTokens, Clock clock, UuidV7Generator ids, LogoutRecoveryPort logoutRecovery) {
        return new AuthenticationService(users, passwords::matches, graphs, compiler, snapshots, sessions,
                refreshTokens, clock, ids::generate, logoutRecovery);
    }
    @Bean LogoutRecoveryPort logoutRecovery(JdbcTemplate jdbc, UuidV7Generator ids) {
        return new JdbcLogoutRecoveryRepository(jdbc, ids);
    }
    @Bean LogoutRecoveryHandler logoutRecoveryHandler(RefreshTokenStore tokens, AccountSessionPort sessions,
            AuthorizationSnapshotStore snapshots, LogoutRecoveryPort recovery) {
        return new LogoutRecoveryHandler(tokens, sessions, snapshots, recovery);
    }
    @Bean RequestAuthorizationLoader requestAuthorizationLoader(AuthorizationSnapshotStore snapshots) {
        return new RequestAuthorizationLoader(snapshots);
    }
    @Bean @RequestScope RequestAuthorizationContext requestAuthorizationContext(RequestAuthorizationLoader loader) {
        return new RequestAuthorizationContext(loader);
    }
    @Bean AuthorizationSnapshotInterceptor authorizationSnapshotInterceptor(
            SaTokenSessionControl sessions, RequestAuthorizationContext context) {
        return new AuthorizationSnapshotInterceptor(sessions, context);
    }
    @Bean WebMvcConfigurer authorizationWebMvcConfigurer(AuthorizationSnapshotInterceptor interceptor) {
        return new WebMvcConfigurer() {
            @Override public void addInterceptors(InterceptorRegistry registry) {
                registry.addInterceptor(interceptor)
                        .excludePathPatterns("/auth/login", "/auth/refresh", "/actuator/**", "/__task12/**");
            }
        };
    }
    @Bean ApplicationRunner bootstrapCredentialProvisioner(JdbcTemplate jdbc, BCryptPasswordEncoder passwords,
            MetaBuilderAuthProperties properties, Environment environment) {
        var provisioner = new BootstrapCredentialProvisioner(new JdbcBootstrapCredentialRepository(jdbc), passwords::encode);
        return ignored -> provisioner.provision(properties.bootstrapAdminPassword(), properties.production());
    }
}
