package com.metabuild.app.config;

import com.metabuild.app.security.RequestAuthorizationContext;
import com.metabuild.infrastructure.jooq.DataScopeAccess;
import com.metabuild.infrastructure.jooq.DataScopeAccessProvider;
import com.metabuild.infrastructure.jooq.DataScopeMetrics;
import com.metabuild.infrastructure.jooq.DataScopeRegistry;
import com.metabuild.infrastructure.jooq.DataScopeRegistryVerifier;
import com.metabuild.infrastructure.jooq.DataScopeVisitListener;
import com.metabuild.modules.admin.auth.application.AccountSessionPort;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.ArrayList;
import java.util.List;
import org.jooq.Table;
import org.springframework.boot.autoconfigure.jooq.DefaultConfigurationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import com.metabuild.shared.kernel.UuidV7Generator;

@Configuration(proxyBeanMethods = false)
public class DataScopeConfiguration {
    @Bean DataScopeRegistry dataScopeRegistry() {
        // 当前 generated schema 只包含 IAM/授权基础设施与 schema probe，均不是租户业务数据。
        // 必须显式列出；不可从 generated schema 自动 whitelist，否则新表会绕过启动门禁。
        List<DataScopeRegistry.Rule> rules = List.of(
                whitelist("mb_authz_refresh_outbox"), whitelist("mb_credential_revocation_outbox"), whitelist("mb_dept"), whitelist("mb_login_log"),
                whitelist("mb_company"), whitelist("mb_dictionary"), whitelist("mb_dictionary_item"),
                whitelist("mb_inbox_message"), whitelist("mb_inbox_publish_outbox"), whitelist("mb_login_audit_outbox"),
                whitelist("mb_menu"), whitelist("mb_menu_customization"), whitelist("mb_operation_log"),
                whitelist("mb_permission"), whitelist("mb_permission_alias"),whitelist("mb_permission_catalog_version"),
                whitelist("mb_refresh_token"), whitelist("mb_role"),
                whitelist("mb_role_custom_dept"), whitelist("mb_role_permission"), whitelist("mb_schema_probe"),
                whitelist("mb_user"), whitelist("mb_user_profile"), whitelist("mb_user_role"), whitelist("biz_schema_probe"));
        return new DataScopeRegistry(rules);
    }

    @Bean DataScopeRegistryVerifier dataScopeRegistryVerifier(DataScopeRegistry registry) {
        return new DataScopeRegistryVerifier(registry, generatedTables());
    }

    @Bean DataScopeAccessProvider dataScopeAccessProvider(AccountSessionPort sessions, RequestAuthorizationContext context) {
        return () -> {
            var userId = sessions.currentUserId();
            if (userId == null) return DataScopeAccess.Marker.UNAUTHENTICATED;
            try { return new DataScopeAccess.Ready(context.load(userId)); }
            catch (RuntimeException failure) { return DataScopeAccess.Marker.INVALID; }
        };
    }

    @Bean DataScopeMetrics dataScopeMetrics(MeterRegistry meters) {
        return reason -> meters.counter("metabuilder.data_scope.fail_closed", "reason", reason).increment();
    }

    @Bean DefaultConfigurationCustomizer dataScopeJooqCustomizer(
            DataScopeRegistry registry, DataScopeAccessProvider access, DataScopeMetrics metrics) {
        return configuration -> configuration.setVisitListenerProvider(
                () -> new DataScopeVisitListener(registry, access, metrics));
    }

    @Bean SystemTaskContext systemTaskContext(){return new SystemTaskContext();}

    @Bean com.metabuild.infrastructure.jooq.SystemPrincipalAuthority systemPrincipalAuthority(
            SystemTaskContext context,
            @Value("${metabuilder.data-scope.system-principal-id}") java.util.UUID systemPrincipalId) {
        return new com.metabuild.infrastructure.security.InternalSystemTaskAuthority(context::active, systemPrincipalId);
    }

    @Bean com.metabuild.infrastructure.jooq.SystemDataScopeAuditPort systemDataScopeAuditPort(
            JdbcTemplate jdbc, UuidV7Generator ids, org.springframework.transaction.PlatformTransactionManager tx) {
        return new com.metabuild.infrastructure.jooq.JdbcSystemDataScopeAuditAdapter(jdbc, ids, tx);
    }

    @Bean SystemTaskRunner systemTaskRunner(SystemTaskContext context,
            com.metabuild.infrastructure.jooq.SystemDataScopeExecutor executor){return new SystemTaskRunner(context,executor);}

    @Bean com.metabuild.infrastructure.jooq.SystemDataScopeExecutor systemDataScopeExecutor(
            com.metabuild.infrastructure.jooq.SystemPrincipalAuthority authority,
            com.metabuild.infrastructure.jooq.SystemDataScopeAuditPort audit) {
        return new com.metabuild.infrastructure.jooq.SystemDataScopeExecutor(authority, audit);
    }

    private static List<Table<?>> generatedTables() {
        var tables = new ArrayList<Table<?>>();
        tables.addAll(com.metabuild.schema.platform.Public.PUBLIC.getTables());
        tables.addAll(com.metabuild.schema.lastmile.Public.PUBLIC.getTables());
        return List.copyOf(tables);
    }

    private static DataScopeRegistry.Whitelisted whitelist(String table) {
        return new DataScopeRegistry.Whitelisted(table, "platform infrastructure or schema probe");
    }
}
