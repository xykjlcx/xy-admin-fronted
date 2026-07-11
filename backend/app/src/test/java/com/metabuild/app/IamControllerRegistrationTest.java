package com.metabuild.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.metabuild.admin.api.security.RequiresPermissions;
import com.metabuild.app.security.PermissionAuthorizationInterceptor;
import com.metabuild.app.security.RequestAuthorizationContext;
import com.metabuild.infrastructure.security.SaTokenSessionControl;
import com.metabuild.modules.admin.departments.application.DepartmentService;
import com.metabuild.modules.admin.departments.controller.DepartmentControllerContract;
import com.metabuild.modules.admin.menus.api.NavigationQuery;
import com.metabuild.modules.admin.menus.application.MenuRepository;
import com.metabuild.modules.admin.menus.controller.MenuController;
import com.metabuild.modules.admin.roles.application.RoleService;
import com.metabuild.modules.admin.roles.controller.RoleControllerContract;
import com.metabuild.modules.admin.users.application.UserService;
import com.metabuild.modules.admin.users.controller.UserControllerContract;
import com.metabuild.shared.kernel.UuidV7Generator;
import com.metabuild.shared.kernel.Forbidden;
import com.metabuild.shared.kernel.Unauthorized;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import com.metabuild.shared.kernel.security.DataScopePolicy;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

@WebMvcTest(value={UserControllerContract.class, DepartmentControllerContract.class,
    RoleControllerContract.class, MenuController.class},properties={
    "metabuilder.auth.token-secret=task18-test-secret-task18-test-secret",
    "metabuilder.auth.bootstrap-admin-password=Task18Test!2026",
    "metabuilder.auth.deployment-mode=development"})
class IamControllerRegistrationTest {
  @Autowired RequestMappingHandlerMapping mappings;
  @MockitoBean UserService users;
  @MockitoBean DepartmentService departments;
  @MockitoBean RoleService roles;
  @MockitoBean NavigationQuery navigation;
  @MockitoBean MenuRepository menus;
  @MockitoBean UuidV7Generator ids;

  @Test void productionContextRegistersEveryIamWriteRoute() {
    Set<String> patterns=mappings.getHandlerMethods().keySet().stream()
        .flatMap(info->info.getPatternValues().stream()).collect(Collectors.toSet());
    assertThat(patterns).contains("/api/users","/api/users/{id}","/api/depts","/api/depts/{id}",
        "/api/roles","/api/roles/{id}","/api/roles/{id}/permissions","/api/menus","/api/menus/{id}",
        "/api/menus/{id}/visibility");
  }

  @Test void everyAnnotatedIamMappingEnforcesAnonymousViewerAndSystemAdmin() {
    var sessions=mock(SaTokenSessionControl.class);
    var context=mock(RequestAuthorizationContext.class);
    var interceptor=new PermissionAuthorizationInterceptor(sessions,context);
    var userId=UUID.fromString("01900000-0000-7000-8000-000000000010");
    var handlers=mappings.getHandlerMethods().values().stream()
        .filter(handler->AnnotatedElementUtils.findMergedAnnotation(handler.getMethod(),RequiresPermissions.class)!=null)
        .toList();
    assertThat(handlers).isNotEmpty();
    handlers.forEach(handler->{
      assertThatThrownBy(()->interceptor.preHandle(null,null,handler))
          .as("anonymous %s",handler).isInstanceOf(Unauthorized.class);
    });
    when(sessions.currentUserId()).thenReturn(userId.toString());
    when(context.load(userId)).thenReturn(snapshot(userId,false));
    handlers.forEach(handler->{
      assertThatThrownBy(()->interceptor.preHandle(null,null,handler))
          .as("viewer %s",handler).isInstanceOf(Forbidden.class);
    });
    when(context.load(userId)).thenReturn(snapshot(userId,true));
    handlers.forEach(handler->{
      assertThatCode(()->interceptor.preHandle(null,null,handler))
          .as("system admin %s",handler).doesNotThrowAnyException();
    });
  }

  private static AuthorizationSnapshot snapshot(UUID userId,boolean systemAdmin) {
    return new AuthorizationSnapshot(userId,1,systemAdmin,Set.of(),Set.of(),
        new DataScopePolicy(true,false,Set.of()),Instant.parse("2026-01-01T00:00:00Z"));
  }
}
