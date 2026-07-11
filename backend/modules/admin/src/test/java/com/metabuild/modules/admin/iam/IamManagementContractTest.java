package com.metabuild.modules.admin.iam;

import static org.assertj.core.api.Assertions.*;
import com.metabuild.admin.api.BatchResult;
import com.metabuild.modules.admin.auth.api.AuthorizationRefreshService;
import com.metabuild.modules.admin.departments.application.*;
import com.metabuild.modules.admin.departments.controller.DepartmentControllerContract;
import com.metabuild.modules.admin.roles.application.*;
import com.metabuild.modules.admin.roles.controller.RoleControllerContract;
import com.metabuild.modules.admin.users.application.*;
import com.metabuild.modules.admin.users.controller.UserControllerContract;
import com.metabuild.shared.kernel.PageResult;
import java.lang.reflect.Method;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.RestController;

class IamManagementContractTest {
 @Test void writeControllersAreContractsNotProductionBeans(){for(Class<?> type:List.of(UserControllerContract.class,DepartmentControllerContract.class,RoleControllerContract.class)){assertThat(type.isAnnotationPresent(RestController.class)).isFalse();assertThat(Arrays.stream(type.getAnnotations()).map(a -> a.annotationType().getSimpleName())).doesNotContain("Component","Service","Repository");}}
 @Test void everyMappedControllerMethodDeclaresPermission() {for(Class<?> type:List.of(UserControllerContract.class,DepartmentControllerContract.class,RoleControllerContract.class))for(Method method:type.getDeclaredMethods())if(Arrays.stream(method.getAnnotations()).anyMatch(a->a.annotationType().getPackageName().equals("org.springframework.web.bind.annotation")))assertThat(method.getAnnotation(com.metabuild.admin.api.security.RequiresPermissions.class)).as(method.toString()).isNotNull();}
 @Test void userWritesRefreshExactlyAffectedUsers(){UUID id=UUID.randomUUID();FakeUsers repo=new FakeUsers(id);RecordingRefresh refresh=new RecordingRefresh();UserService service=new UserService(repo,refresh);assertThat(service.disable(Set.of(id))).isOne();assertThat(refresh.users).containsExactly(id);assertThat(refresh.cause).isEqualTo(AuthorizationRefreshService.Cause.USER_CHANGED);}
 @Test void departmentMoveUsesPreimageForRefresh(){UUID user=UUID.randomUUID(),dept=UUID.randomUUID();RecordingRefresh refresh=new RecordingRefresh();DepartmentRepository repo=new DepartmentRepository(){public List<DepartmentView> tree(){return List.of();}public Optional<DepartmentView> find(UUID id){return Optional.empty();}public DepartmentView create(UUID id,String n,UUID p){return null;}public DepartmentMovePreimage movePreimage(UUID id,UUID p){return new DepartmentMovePreimage(Set.of(user));}public DepartmentView patch(UUID id,DepartmentPatch p){return new DepartmentView(id,p.parentId(),p.name(),0,1);}public Set<UUID> subtree(Set<UUID> r){return Set.of();}public BatchResult<UUID,com.metabuild.admin.api.DepartmentSummary> batchGet(Set<UUID> i){return new BatchResult<>(Map.of(),i);}};new DepartmentService(repo,refresh).update(dept,new DepartmentPatch(true,"Moved",true,null));assertThat(refresh.users).containsExactly(user);}
 @Test void allFiveDataScopesAreExplicit(){assertThat(RoleRepository.DataScope.values()).containsExactlyInAnyOrder(RoleRepository.DataScope.ALL,RoleRepository.DataScope.OWN_DEPT_AND_BELOW,RoleRepository.DataScope.OWN_DEPT,RoleRepository.DataScope.SELF,RoleRepository.DataScope.CUSTOM_DEPT);}
 static final class RecordingRefresh implements AuthorizationRefreshService {Set<UUID> users=Set.of();Cause cause;public <T>T execute(Cause c,AuthorizationChange<T> change){cause=c;users=Set.copyOf(change.affectedUserIds());return change.mutate();}public <T>T executeTerminal(TerminalChange<T> change){cause=Cause.USER_CHANGED;users=Set.copyOf(change.affectedUserIds());return change.mutate();}}
 static final class FakeUsers implements UserRepository {final UUID id;FakeUsers(UUID id){this.id=id;}public PageResult<UserView> search(int a,int b,String c,UUID d,boolean e,String f){return new PageResult<>(List.of(),0);}public Optional<UserView> find(UUID id){return Optional.empty();}public UserView create(UUID a,String b,UUID c,String d,String e,String f){return null;}public UserView update(UUID a,UserPatch p){return null;}public Set<UUID> softDelete(UUID id){return Set.of(id);}public Set<UUID> disable(Set<UUID> ids){return ids;}public Set<UUID> enable(Set<UUID> ids){return ids;}public Set<UUID> moveToDepartment(Set<UUID> ids,UUID d){return ids;}public Set<UUID> usersInDepartments(Set<UUID> d){return Set.of();}public BatchResult<UUID,com.metabuild.admin.api.UserSummary> batchGet(Set<UUID> i){return new BatchResult<>(Map.of(),i);}}
}
