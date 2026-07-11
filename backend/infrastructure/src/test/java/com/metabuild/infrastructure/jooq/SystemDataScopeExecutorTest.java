package com.metabuild.infrastructure.jooq;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;

class SystemDataScopeExecutorTest {
    private static final java.util.UUID SYSTEM=java.util.UUID.fromString("01900000-0000-7000-8000-000000000001");
    @Test void auditMustPersistBeforeBypassAndOrdinaryPrincipalIsRejected() {
        var ran = new AtomicBoolean();
        var rejected = new SystemDataScopeExecutor(() -> { throw new SecurityException("ordinary"); }, audit(false));
        assertThatThrownBy(() -> rejected.execute("job", () -> { ran.set(true); return null; }))
                .isInstanceOf(SecurityException.class);
        assertThat(ran).isFalse();

        var auditFailure = new SystemDataScopeExecutor(authority(), audit(true));
        assertThatThrownBy(() -> auditFailure.execute("job", () -> { ran.set(true); return null; }))
                .hasMessage("audit unavailable");
        assertThat(ran).isFalse();
    }

    @Test void rejectsBlankReasonNestedBypassAndAlwaysCleansUp() {
        var order = new ArrayList<String>();
        var executor = new SystemDataScopeExecutor(authority(), new SystemDataScopeAuditPort(){
            public java.util.UUID begin(String r,com.metabuild.infrastructure.security.SystemTaskIdentity i){order.add("audit");return SYSTEM;}
            public void complete(java.util.UUID id,boolean success,String outcome){}
        });
        assertThatThrownBy(() -> executor.execute(" ", () -> null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> executor.execute("outer", () ->
                executor.execute("inner", () -> null))).hasMessageContaining("Nested");
        assertThat(DataScopeBypass.active()).isFalse();
        assertThatThrownBy(() -> executor.execute("failure", () -> { throw new IllegalArgumentException("boom"); }))
                .hasMessage("boom");
        assertThat(DataScopeBypass.active()).isFalse();
        assertThat(order).isNotEmpty();
    }

    @Test void bypassNeverCrossesThreadBoundary() {
        var executor = new SystemDataScopeExecutor(authority(), audit(false));
        executor.execute("job", () -> {
            assertThat(DataScopeBypass.active()).isTrue();
            assertThat(CompletableFuture.supplyAsync(DataScopeBypass::active).join()).isFalse();
            return null;
        });
    }

    private static SystemPrincipalAuthority authority(){
        return new com.metabuild.infrastructure.security.InternalSystemTaskAuthority(()->true,SYSTEM);
    }
    private static SystemDataScopeAuditPort audit(boolean fail){return new SystemDataScopeAuditPort(){
        public java.util.UUID begin(String r,com.metabuild.infrastructure.security.SystemTaskIdentity i){if(fail)throw new IllegalStateException("audit unavailable");return SYSTEM;}
        public void complete(java.util.UUID id,boolean success,String outcome){}
    };}
}
