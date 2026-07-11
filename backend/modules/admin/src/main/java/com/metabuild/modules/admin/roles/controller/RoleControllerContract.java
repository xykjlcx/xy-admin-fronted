package com.metabuild.modules.admin.roles.controller;

import com.metabuild.admin.api.security.RequiresPermissions;
import com.metabuild.modules.admin.roles.application.*;
import com.metabuild.shared.kernel.UuidV7Generator;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public final class RoleControllerContract {
 private final RoleService roles; private final UuidV7Generator ids;
 public RoleControllerContract(RoleService roles,UuidV7Generator ids){this.roles=roles;this.ids=ids;}
 @GetMapping("/roles") @RequiresPermissions(codes={"iam:role:view"}) public List<RoleView> list(){return roles.list();}
 @GetMapping("/roles/{id}") @RequiresPermissions(codes={"iam:role:view"}) public RoleView detail(@PathVariable UUID id){return roles.detail(id);}
 @GetMapping("/permissions/tree") @RequiresPermissions(codes={"iam:role:view"}) public List<RoleRepository.PermissionGroup> tree(){return roles.permissionTree();}
 @GetMapping("/roles/{id}/permissions") @RequiresPermissions(codes={"iam:role:view"}) public Map<String,Set<String>> permissions(@PathVariable UUID id){return roles.permissions(id);}
 @GetMapping("/roles/{id}/data-permissions") @RequiresPermissions(codes={"iam:role:view"}) public DataPermission data(@PathVariable UUID id){return DataPermission.from(roles.dataScope(id));}
 @GetMapping("/roles/{id}/members") @RequiresPermissions(codes={"iam:role:view"}) public List<RoleRepository.RoleMember> members(@PathVariable UUID id){return roles.members(id);}
 @GetMapping("/role-audit-logs") @RequiresPermissions(codes={"iam:role:view"}) public List<RoleRepository.RoleAuditLog> audits(){return roles.auditLogs();}
 @PostMapping("/roles") @RequiresPermissions(codes={"iam:role:create"}) public RoleView create(@RequestBody Create b){validate(b);return roles.create(ids.generate(),b.name(),b.desc());}
 @PutMapping("/roles/{id}") @RequiresPermissions(codes={"iam:role:grant"}) public RoleView update(@PathVariable UUID id,@RequestBody Create b){validate(b);return roles.update(id,b.name(),b.desc());}
 @DeleteMapping("/roles/{id}") @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT) @RequiresPermissions(codes={"iam:role:del"}) public void delete(@PathVariable UUID id){roles.delete(id);}
 @PostMapping("/roles/{id}/disable") @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT) @RequiresPermissions(codes={"iam:role:del"}) public void disable(@PathVariable UUID id){roles.disable(id);}
 @PutMapping("/roles/{id}/permissions") @RequiresPermissions(codes={"iam:role:grant"}) public Map<String,Set<String>> savePermissions(@PathVariable UUID id,@RequestBody Map<String,Set<String>> groups){if(groups==null)throw new com.metabuild.shared.kernel.BadRequest(()->"request.validation.failed","Permission grants are required");return roles.grant(id,groups);}
 @PutMapping("/roles/{id}/data-permissions") @RequiresPermissions(codes={"iam:role:grant"}) public DataPermission saveData(@PathVariable UUID id,@RequestBody DataPermission b){validate(b);return DataPermission.from(roles.scope(id,b.defaultScope(),b.defaultDepartmentIds()));}
 public record Create(String name,String desc){}
 public record DataPermission(RoleRepository.DataScope defaultScope,Set<UUID> defaultDepartmentIds,Map<String,Object> resources){static DataPermission from(RoleRepository.DataScopeGrant g){return new DataPermission(g.scope(),Set.copyOf(g.departmentIds()),Map.of());}}
 private static void validate(Create b){if(b==null||b.name()==null||b.name().isBlank())throw invalid("Role name is required");}
 private static void validate(DataPermission b){if(b==null||b.defaultScope()==null||b.defaultDepartmentIds()==null||b.resources()==null)throw invalid("Invalid data permission payload");}
 private static com.metabuild.shared.kernel.BadRequest invalid(String detail){return new com.metabuild.shared.kernel.BadRequest(()->"request.validation.failed",detail);}
}
