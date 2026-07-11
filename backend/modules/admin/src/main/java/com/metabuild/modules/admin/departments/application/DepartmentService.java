package com.metabuild.modules.admin.departments.application;
import com.metabuild.modules.admin.auth.api.AuthorizationRefreshService; import java.util.*;
public final class DepartmentService {
 private final DepartmentRepository depts; private final AuthorizationRefreshService refresh;
 public DepartmentService(DepartmentRepository d,AuthorizationRefreshService r){depts=d;refresh=r;}
 public List<DepartmentView> tree(){return depts.tree();}
 public DepartmentView create(UUID id,String name,UUID parent){return refresh.execute(AuthorizationRefreshService.Cause.DEPARTMENT_CHANGED,new AuthorizationRefreshService.AuthorizationChange<>(){public Set<UUID> affectedUserIds(){return Set.of();}public DepartmentView mutate(){return depts.create(id,name,parent);}});}
 public DepartmentView update(UUID id,DepartmentPatch patch){if(patch.empty())throw new com.metabuild.shared.kernel.BadRequest(()->"request.validation.failed","Department patch is empty");return refresh.execute(AuthorizationRefreshService.Cause.DEPARTMENT_CHANGED,new AuthorizationRefreshService.AuthorizationChange<>(){public Set<UUID> affectedUserIds(){return patch.parentPresent()?depts.movePreimage(id,patch.parentId()).affectedUserIds():Set.of();}public DepartmentView mutate(){return depts.patch(id,patch);}});}
}
