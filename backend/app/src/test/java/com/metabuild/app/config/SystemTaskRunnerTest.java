package com.metabuild.app.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SystemTaskRunnerTest {
    private static final UUID SYSTEM=UUID.fromString("01900000-0000-7000-8000-000000000011");
    @Test void backgroundConsumerCanOnlyReachBypassThroughInternalRunner(){
        var context=new SystemTaskContext();
        var authority=new com.metabuild.infrastructure.security.InternalSystemTaskAuthority(context::active,SYSTEM);
        var audit=new com.metabuild.infrastructure.jooq.SystemDataScopeAuditPort(){
            public UUID begin(String r,com.metabuild.infrastructure.security.SystemTaskIdentity i){return SYSTEM;}
            public void complete(UUID id,boolean success,String outcome){}
        };
        var executor=new com.metabuild.infrastructure.jooq.SystemDataScopeExecutor(authority,audit);
        assertThatThrownBy(()->executor.execute("direct",()->null)).isInstanceOf(SecurityException.class);
        assertThat(new SystemTaskRunner(context,executor).run("scheduled-reconcile",()->"ok")).isEqualTo("ok");
    }
    @Test void contextAndRunnerAreNotPublicBusinessApis(){
        assertThat(java.lang.reflect.Modifier.isPublic(SystemTaskContext.class.getModifiers())).isFalse();
        assertThat(java.lang.reflect.Modifier.isPublic(SystemTaskRunner.class.getModifiers())).isFalse();
    }
}
