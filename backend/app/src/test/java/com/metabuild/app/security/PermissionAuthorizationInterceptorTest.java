package com.metabuild.app.security;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.metabuild.admin.api.security.PermissionLogic;
import com.metabuild.admin.api.security.RequiresPermissions;
import com.metabuild.infrastructure.security.SaTokenSessionControl;
import com.metabuild.shared.kernel.Forbidden;
import com.metabuild.shared.kernel.Unauthorized;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import com.metabuild.shared.kernel.security.DataScopePolicy;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.web.method.HandlerMethod;

class PermissionAuthorizationInterceptorTest {
    private static final UUID USER=UUID.fromString("01900000-0000-7000-8000-000000000010");
    @Test void annotationIsAnEnforcedRuntimeBoundary() throws Exception {
        var sessions=mock(SaTokenSessionControl.class);var context=mock(RequestAuthorizationContext.class);
        var interceptor=new PermissionAuthorizationInterceptor(sessions,context);
        var and=new HandlerMethod(new Fixture(),Fixture.class.getDeclaredMethod("and"));
        var or=new HandlerMethod(new Fixture(),Fixture.class.getDeclaredMethod("or"));
        var empty=new HandlerMethod(new Fixture(),Fixture.class.getDeclaredMethod("empty"));
        assertThatThrownBy(()->interceptor.preHandle(null,null,empty)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->interceptor.preHandle(null,null,and)).isInstanceOf(Unauthorized.class).hasMessageContaining("Authentication");
        when(sessions.currentUserId()).thenReturn(USER.toString());
        when(context.load(USER)).thenReturn(snapshot(false,Set.of("iam:user:view")));
        assertThatThrownBy(()->interceptor.preHandle(null,null,and)).isInstanceOf(Forbidden.class).hasMessageContaining("Permission");
        assertThat(interceptor.preHandle(null,null,or)).isTrue();
        when(context.load(USER)).thenReturn(snapshot(true,Set.of()));
        assertThat(interceptor.preHandle(null,null,and)).isTrue();
    }
    private static AuthorizationSnapshot snapshot(boolean admin,Set<String> permissions){return new AuthorizationSnapshot(USER,1,admin,Set.of(),permissions,new DataScopePolicy(true,false,Set.of()),Instant.parse("2026-01-01T00:00:00Z"));}
    static final class Fixture{
        @RequiresPermissions(codes={"iam:user:view","iam:user:update"}) void and(){}
        @RequiresPermissions(codes={"iam:user:view","iam:user:update"},logic=PermissionLogic.OR) void or(){}
        @RequiresPermissions(codes={}) void empty(){}
    }
}
