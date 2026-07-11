package com.metabuild.modules.admin.roles.application;
import java.util.*;
public interface RoleRepository {
 List<RoleView> list(); Optional<RoleView> find(UUID id); RoleView create(UUID id,String name,String description); RoleView update(UUID id,String name,String description); Set<UUID> members(UUID roleId); List<RoleMember> memberViews(UUID roleId); List<PermissionGroup> permissionTree(); List<RoleAuditLog> auditLogs(); void delete(UUID id); void disable(UUID id); void replacePermissions(UUID id,Map<String,Set<String>> grants); void replaceDataScope(UUID id,DataScope scope,Set<UUID> customDepartments); Map<String,Set<String>> permissions(UUID id); DataScopeGrant dataScope(UUID id);
 enum DataScope {
  ALL("all"), OWN_DEPT_AND_BELOW("deptAndChildren"), OWN_DEPT("dept"), SELF("self"), CUSTOM_DEPT("custom");
  private final String wire;
  DataScope(String wire){this.wire=wire;}
  @com.fasterxml.jackson.annotation.JsonValue public String wire(){return wire;}
  @com.fasterxml.jackson.annotation.JsonCreator public static DataScope fromWire(String value){return Arrays.stream(values()).filter(v->v.wire.equals(value)).findFirst().orElseThrow();}
 }
 record DataScopeGrant(DataScope scope,Set<UUID> departmentIds){public DataScopeGrant{departmentIds=Set.copyOf(departmentIds);}}
 record RoleMember(UUID id,String name,String deptLabel,String title){}
 record PermissionAction(String id,String label){}
 record PermissionResource(String id,String label,String code,List<PermissionAction> actions){public PermissionResource{actions=List.copyOf(actions);}}
 record PermissionGroup(String id,String label,List<PermissionResource> resources){public PermissionGroup{resources=List.copyOf(resources);}}
 record RoleAuditLog(UUID id,java.time.Instant occurredAt,String operator,UUID roleId,String roleName,String kind,String change){}
}
