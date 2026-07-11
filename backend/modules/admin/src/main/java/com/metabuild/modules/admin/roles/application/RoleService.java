package com.metabuild.modules.admin.roles.application;

import com.metabuild.modules.admin.auth.api.AuthorizationRefreshService;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public final class RoleService {
    private final RoleRepository roles; private final AuthorizationRefreshService refresh;
    public RoleService(RoleRepository roles,AuthorizationRefreshService refresh){this.roles=roles;this.refresh=refresh;}
    public List<RoleView> list(){return roles.list();}
    public RoleView detail(UUID id){return roles.find(id).orElseThrow(()->new com.metabuild.shared.kernel.NotFound(()->"iam.role.not-found","Role not found"));}
    public List<RoleRepository.RoleMember> members(UUID id){detail(id);return roles.memberViews(id);}
    public List<RoleRepository.PermissionGroup> permissionTree(){return roles.permissionTree();}
    public List<RoleRepository.RoleAuditLog> auditLogs(){return roles.auditLogs();}
    public Map<String,Set<String>> permissions(UUID id){detail(id);return roles.permissions(id);}
    public RoleRepository.DataScopeGrant dataScope(UUID id){detail(id);return roles.dataScope(id);}
    public RoleView create(UUID id,String name,String description){return refresh.execute(AuthorizationRefreshService.Cause.ROLE_CHANGED,new AuthorizationRefreshService.AuthorizationChange<>(){public Set<UUID> affectedUserIds(){return Set.of();}public RoleView mutate(){return roles.create(id,name,description==null?"":description);}});}
    public RoleView update(UUID id,String name,String description){return refresh.execute(AuthorizationRefreshService.Cause.ROLE_CHANGED,change(id,()->roles.update(id,name,description)));}
    public void delete(UUID id){refresh.execute(AuthorizationRefreshService.Cause.ROLE_CHANGED,change(id,()->{roles.delete(id);return null;}));}
    public void disable(UUID id){refresh.execute(AuthorizationRefreshService.Cause.ROLE_CHANGED,change(id,()->{roles.disable(id);return null;}));}
    public Map<String,Set<String>> grant(UUID id,Map<String,Set<String>> grants){return refresh.execute(AuthorizationRefreshService.Cause.GRANT_CHANGED,change(id,()->{roles.replacePermissions(id,grants);return roles.permissions(id);}));}
    public RoleRepository.DataScopeGrant scope(UUID id,RoleRepository.DataScope scope,Set<UUID> depts){return refresh.execute(AuthorizationRefreshService.Cause.DATA_SCOPE_CHANGED,change(id,()->{roles.replaceDataScope(id,scope,depts);return roles.dataScope(id);}));}
    private <T> AuthorizationRefreshService.AuthorizationChange<T> change(UUID role,java.util.function.Supplier<T> mutation){return new AuthorizationRefreshService.AuthorizationChange<>(){public Set<UUID> affectedUserIds(){return roles.members(role);}public T mutate(){return mutation.get();}};}
}
