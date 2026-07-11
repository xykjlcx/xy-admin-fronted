package com.metabuild.app;

import static org.assertj.core.api.Assertions.assertThat;

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
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
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
}
