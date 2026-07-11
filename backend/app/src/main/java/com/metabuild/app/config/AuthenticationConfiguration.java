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
import com.metabuild.modules.admin.auth.application.AuthorizationBatchSnapshotStore;
import com.metabuild.modules.admin.auth.application.AuthorizationCommandExecutor;
import com.metabuild.modules.admin.auth.application.AuthorizationRefreshPort;
import com.metabuild.modules.admin.auth.api.AuthorizationRefreshService;
import com.metabuild.modules.admin.auth.application.AuthUserRepository;
import com.metabuild.modules.admin.auth.application.BootstrapCredentialProvisioner;
import com.metabuild.modules.admin.auth.application.RefreshTokenService;
import com.metabuild.modules.admin.auth.application.RefreshTokenStore;
import com.metabuild.modules.admin.auth.persistence.JdbcAuthorizationGraphRepository;
import com.metabuild.modules.admin.auth.persistence.JdbcAuthUserRepository;
import com.metabuild.modules.admin.auth.persistence.JdbcBootstrapCredentialRepository;
import com.metabuild.modules.admin.auth.persistence.JdbcRefreshTokenStore;
import com.metabuild.modules.admin.auth.persistence.JdbcLogoutRecoveryRepository;
import com.metabuild.modules.admin.auth.persistence.JdbcAuthorizationRefreshRepository;
import com.metabuild.modules.admin.auth.persistence.JdbcAuthorizationReconciliationRepository;
import com.metabuild.modules.admin.auth.application.AuthorizationReconciliationPort;
import com.metabuild.modules.admin.auth.application.AuthorizationReconciler;
import com.metabuild.modules.admin.users.application.UserRepository;
import com.metabuild.modules.admin.users.application.UserService;
import com.metabuild.modules.admin.users.persistence.JdbcUserRepository;
import com.metabuild.modules.admin.dictionaries.application.*;
import com.metabuild.modules.admin.dictionaries.persistence.JooqDictionaryRepository;
import com.metabuild.modules.admin.company.application.*;
import com.metabuild.modules.admin.company.persistence.JooqCompanyRepository;
import com.metabuild.modules.admin.profile.application.*;
import com.metabuild.modules.admin.profile.persistence.JooqProfileRepository;
import com.metabuild.modules.admin.users.controller.UserControllerContract;
import com.metabuild.modules.admin.departments.application.DepartmentRepository;
import com.metabuild.modules.admin.departments.application.DepartmentService;
import com.metabuild.modules.admin.departments.persistence.JdbcDepartmentRepository;
import com.metabuild.modules.admin.departments.controller.DepartmentControllerContract;
import com.metabuild.modules.admin.roles.application.RoleRepository;
import com.metabuild.modules.admin.roles.application.RoleService;
import com.metabuild.modules.admin.roles.persistence.JdbcRoleRepository;
import com.metabuild.modules.admin.roles.controller.RoleControllerContract;
import com.metabuild.modules.admin.auth.application.CurrentUserQuery;
import com.metabuild.modules.admin.auth.application.CurrentUserRepository;
import com.metabuild.modules.admin.auth.persistence.JdbcCurrentUserRepository;
import com.metabuild.modules.admin.menus.application.MenuQuery;
import com.metabuild.modules.admin.menus.application.MenuRepository;
import com.metabuild.modules.admin.menus.persistence.JdbcMenuRepository;
import com.metabuild.modules.admin.menus.controller.MenuController;
import com.metabuild.modules.admin.auth.api.CurrentAuthorizationProvider;
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
import com.metabuild.app.security.PermissionAuthorizationInterceptor;
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
    @Bean AuthorizationRefreshPort authorizationRefreshPort(JdbcTemplate jdbc,PlatformTransactionManager manager,
            AuthorizationGraphRepository graphs,AuthorizationSnapshotCompiler compiler,UuidV7Generator ids,Clock clock){
        return new JdbcAuthorizationRefreshRepository(jdbc,manager,graphs,compiler,ids,clock);
    }
    @Bean AuthorizationRefreshService authorizationRefreshService(AuthorizationRefreshPort database,
            AuthorizationBatchSnapshotStore snapshots,UuidV7Generator ids,Clock clock,LogoutRecoveryHandler terminal){
        return new AuthorizationCommandExecutor(database,snapshots,ids::generate,clock,terminal);
    }
    @Bean AuthorizationReconciliationPort authorizationReconciliationPort(JdbcTemplate jdbc,Clock clock){return new JdbcAuthorizationReconciliationRepository(jdbc,clock);}
    @Bean AuthorizationReconciler authorizationReconciler(AuthorizationReconciliationPort tasks,AuthorizationRefreshPort database,
            AuthorizationBatchSnapshotStore batch,AuthorizationSnapshotStore states,LogoutRecoveryHandler terminal,Clock clock,UuidV7Generator ids){
        return new AuthorizationReconciler(tasks,database,batch,states,terminal,(com.metabuild.modules.admin.auth.application.AuthorizationFenceIndex)states,clock,ids.generate(),100);
    }
    @Bean AuthorizationReconciliationScheduler authorizationReconciliationScheduler(AuthorizationReconciler reconciler){return new AuthorizationReconciliationScheduler(reconciler);}
    @Bean UserRepository userRepository(JdbcTemplate jdbc){return new JdbcUserRepository(jdbc);}
    @Bean UserService userService(UserRepository users,AuthorizationRefreshService refresh){return new UserService(users,refresh);}
    @Bean DepartmentRepository departmentRepository(JdbcTemplate jdbc){return new JdbcDepartmentRepository(jdbc);}
    @Bean DepartmentService departmentService(DepartmentRepository depts,AuthorizationRefreshService refresh){return new DepartmentService(depts,refresh);}
    @Bean RoleRepository roleRepository(JdbcTemplate jdbc){return new JdbcRoleRepository(jdbc);}
    @Bean RoleService roleService(RoleRepository roles,AuthorizationRefreshService refresh){return new RoleService(roles,refresh);}
    @Bean DictionaryRepository dictionaryRepository(org.jooq.DSLContext db){return new JooqDictionaryRepository(db);}
    @Bean DictionaryService dictionaryService(DictionaryRepository repository,UuidV7Generator ids){return new DictionaryService(repository,ids);}
    @Bean CompanyRepository companyRepository(org.jooq.DSLContext db,UuidV7Generator ids){return new JooqCompanyRepository(db,ids);}
    @Bean CompanyService companyService(CompanyRepository repository){return new CompanyService(repository);}
    @Bean ProfileRepository profileRepository(org.jooq.DSLContext db){return new JooqProfileRepository(db);}
    @Bean ProfileSessionPort profileSessions(SaTokenSessionControl sessions,RefreshTokenStore refresh){return new SaProfileSessionAdapter(sessions,refresh);}
    @Bean ProfileService profileService(ProfileRepository repository,ProfileSessionPort sessions,BCryptPasswordEncoder passwords){return new ProfileService(repository,sessions,new PasswordCodec(){public String hash(String raw){return passwords.encode(raw);}public boolean matches(String raw,String encoded){return passwords.matches(raw,encoded);}});}
    @Bean CredentialRevocationScheduler credentialRevocationScheduler(ProfileService profiles){return new CredentialRevocationScheduler(profiles);}
    @Bean PermissionCatalogSynchronizer permissionCatalogSynchronizer(JdbcTemplate jdbc,
            PlatformTransactionManager manager,AuthorizationRefreshService refresh,UuidV7Generator ids,ObjectMapper json){
        return new PermissionCatalogSynchronizer(jdbc,refresh,ids,json);
    }
    @Bean IamRuntimeCompletenessGate iamRuntimeCompletenessGate(AuthorizationRefreshService refresh,
            AuthorizationBatchSnapshotStore fence,AuthorizationReconciler reconciler,
            PermissionCatalogSynchronizer synchronizer){return new IamRuntimeCompletenessGate(refresh,fence,reconciler,synchronizer);}
    @Bean ApplicationRunner permissionCatalogStartupSynchronizer(PermissionCatalogSynchronizer synchronizer,
            AuthorizationReconciler reconciler,UserControllerContract users,DepartmentControllerContract departments,
            RoleControllerContract roles,IamRuntimeCompletenessGate gate){
        // 参数是启动完备性门禁：Fence/Reconciler 与 IAM 写入口缺任一 bean，context 必须失败。
        return ignored -> synchronizer.synchronize();
    }
    @Bean SaTokenSessionControl saTokenSessionControl() { return new SaTokenSessionControl(); }
    @Bean AccountSessionPort accountSessions(SaTokenSessionControl sessions) { return new AccountSessionAdapter(sessions); }
    @Bean RefreshTokenStore refreshTokens(JdbcTemplate jdbc, PlatformTransactionManager transactions,
            UuidV7Generator ids, Clock clock) {
        return new JdbcRefreshTokenStore(jdbc, transactions, ids, clock, Duration.ofDays(7));
    }
    @Bean RefreshTokenService refreshTokenService(RefreshTokenStore tokens, AuthorizationSnapshotStore snapshots,AuthUserRepository users,AccountSessionPort sessions) {
        return new RefreshTokenService(tokens, snapshots,users,sessions);
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
    @Bean CurrentUserRepository currentUsers(JdbcTemplate jdbc) { return new JdbcCurrentUserRepository(jdbc); }
    @Bean CurrentUserQuery currentUserQuery(CurrentAuthorizationProvider authorization,
            CurrentUserRepository users) { return new CurrentUserQuery(authorization, users); }
    @Bean MenuRepository menuRepository(JdbcTemplate jdbc,ObjectMapper json) { return new JdbcMenuRepository(jdbc,json); }
    @Bean CurrentAuthorizationProvider currentAuthorization(AccountSessionPort sessions, RequestAuthorizationContext context) {
        return () -> {
            var userId = sessions.currentUserId();
            if (userId == null) throw new com.metabuild.shared.kernel.Unauthorized(
                    () -> "auth.token.invalid", "Authentication required");
            return context.load(userId);
        };
    }
    @Bean MenuQuery menuQuery(MenuRepository menus, CurrentAuthorizationProvider authorization) {
        return new MenuQuery(menus, authorization);
    }
    @Bean @RequestScope RequestAuthorizationContext requestAuthorizationContext(RequestAuthorizationLoader loader) {
        return new RequestAuthorizationContext(loader);
    }
    @Bean AuthorizationSnapshotInterceptor authorizationSnapshotInterceptor(
            SaTokenSessionControl sessions, RequestAuthorizationContext context) {
        return new AuthorizationSnapshotInterceptor(sessions, context);
    }
    @Bean PermissionAuthorizationInterceptor permissionAuthorizationInterceptor(
            SaTokenSessionControl sessions, RequestAuthorizationContext context) {
        return new PermissionAuthorizationInterceptor(sessions, context);
    }
    @Bean WebMvcConfigurer authorizationWebMvcConfigurer(AuthorizationSnapshotInterceptor interceptor,
            PermissionAuthorizationInterceptor permissions) {
        return new WebMvcConfigurer() {
            @Override public void addInterceptors(InterceptorRegistry registry) {
                registry.addInterceptor(interceptor)
                        .excludePathPatterns("/api/auth/login", "/api/auth/refresh", "/actuator/**", "/__task12/**")
                        .order(0);
                registry.addInterceptor(permissions).order(1);
            }
        };
    }
    @Bean ApplicationRunner bootstrapCredentialProvisioner(JdbcTemplate jdbc, BCryptPasswordEncoder passwords,
            MetaBuilderAuthProperties properties, Environment environment) {
        var provisioner = new BootstrapCredentialProvisioner(new JdbcBootstrapCredentialRepository(jdbc), passwords::encode);
        return ignored -> provisioner.provision(properties.bootstrapAdminPassword(), properties.production());
    }
}
