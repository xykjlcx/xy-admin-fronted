package com.metabuild.app.security;

import com.metabuild.admin.api.security.PermissionLogic;
import com.metabuild.admin.api.security.PermissionRequirementResolver;
import com.metabuild.infrastructure.security.SaTokenSessionControl;
import com.metabuild.shared.kernel.Forbidden;
import com.metabuild.shared.kernel.Unauthorized;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.UUID;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/** 将 OpenAPI 权限声明落到真实 HTTP 运行时边界。 */
public final class PermissionAuthorizationInterceptor implements HandlerInterceptor {
    private final SaTokenSessionControl sessions;
    private final RequestAuthorizationContext context;
    public PermissionAuthorizationInterceptor(SaTokenSessionControl sessions,RequestAuthorizationContext context){this.sessions=sessions;this.context=context;}
    @Override public boolean preHandle(HttpServletRequest request,HttpServletResponse response,Object handler){
        if(!(handler instanceof HandlerMethod method))return true;
        var resolved=PermissionRequirementResolver.resolve(method.getMethod());
        if(resolved.isEmpty())return true;
        var required=resolved.orElseThrow();
        String current=sessions.currentUserId();
        if(current==null)throw new Unauthorized(()->"auth.unauthorized","Authentication required");
        var snapshot=context.load(UUID.fromString(current));
        if(snapshot.systemAdmin())return true;
        boolean granted=required.logic()==PermissionLogic.AND
                ? required.codes().stream().allMatch(snapshot.permissions()::contains)
                : required.codes().stream().anyMatch(snapshot.permissions()::contains);
        if(!granted)throw new Forbidden(()->"auth.permission-denied","Permission denied");
        return true;
    }
}
