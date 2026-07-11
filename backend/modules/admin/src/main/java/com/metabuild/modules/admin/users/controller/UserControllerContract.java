package com.metabuild.modules.admin.users.controller;

import com.metabuild.admin.api.security.RequiresPermissions;
import com.metabuild.modules.admin.users.application.*;
import com.metabuild.shared.kernel.PageResult;
import com.metabuild.shared.kernel.UuidV7Generator;
import java.util.Set;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public final class UserControllerContract {
 private final UserService users; private final UuidV7Generator ids;
 public UserControllerContract(UserService users,UuidV7Generator ids){this.users=users;this.ids=ids;}
 @GetMapping @RequiresPermissions(codes = {"iam:user:view"}) public PageResult<UserView> list(@RequestParam int page,@RequestParam int pageSize,@RequestParam(defaultValue="all") String status,@RequestParam(required=false) UUID deptId,@RequestParam(defaultValue="false") boolean directOnly,@RequestParam(required=false) String keyword){return users.search(page,pageSize,status,deptId,directOnly,keyword);}
 @GetMapping("/{id}") @RequiresPermissions(codes = {"iam:user:view"}) public UserView detail(@PathVariable UUID id){return users.detail(id);}
 @PostMapping @RequiresPermissions(codes = {"iam:user:create"}) public UserView create(@RequestBody CreateUserWrite body){validate(body);return users.create(ids.generate(),body.name(),body.deptId(),body.role(),body.phone(),body.email());}
 @PutMapping("/{id}") @RequiresPermissions(codes = {"iam:user:update"}) public UserView update(@PathVariable UUID id,@RequestBody UpdateUserWrite body){if(body==null)throw invalid();return users.update(id,body.toPatch());}
 @DeleteMapping("/{id}") @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT) @RequiresPermissions(codes = {"iam:user:del"}) public void delete(@PathVariable UUID id){users.delete(id);}
 @PostMapping("/batch-disable") @RequiresPermissions(codes = {"iam:user:resign"}) public BatchCount disable(@RequestBody Ids body){return new BatchCount(users.disable(body.ids()));}
 @PostMapping("/batch-enable") @RequiresPermissions(codes = {"iam:user:update"}) public BatchCount enable(@RequestBody Ids body){return new BatchCount(users.enable(body.ids()));}
 @PostMapping("/batch-move") @RequiresPermissions(codes = {"iam:user:update"}) public BatchCount move(@RequestBody Move body){return new BatchCount(users.move(body.ids(),body.deptId()));}
 public record CreateUserWrite(String name,UUID deptId,String role,String phone,String email) {}
 public static final class UpdateUserWrite {private boolean np,dp,rp,pp,ep;private String name,role,phone,email;private UUID deptId;public void setName(String v){np=true;name=v;}public void setDeptId(UUID v){dp=true;deptId=v;}public void setRole(String v){rp=true;role=v;}public void setPhone(String v){pp=true;phone=v;}public void setEmail(String v){ep=true;email=v;}public UserPatch toPatch(){if((np&&(name==null||name.isBlank()))||(dp&&deptId==null)||(rp&&(role==null||role.isBlank()))||(ep&&(email==null||!email.contains("@"))))throw invalid();return new UserPatch(np,name,dp,deptId,rp,role,pp,phone,ep,email);}}
 public record Ids(Set<UUID> ids){public Ids{if(ids==null||ids.isEmpty())throw invalid();ids=Set.copyOf(ids);}}
 public record Move(Set<UUID> ids,UUID deptId){public Move{if(ids==null||ids.isEmpty()||deptId==null)throw invalid();ids=Set.copyOf(ids);}}
 public record BatchCount(int updated){}
 private static void validate(CreateUserWrite body){if(body==null||body.name()==null||body.name().isBlank()||body.deptId()==null||body.role()==null||body.role().isBlank()||body.phone()==null||body.phone().isBlank()||body.email()==null||!body.email().contains("@"))throw invalid();}
 private static com.metabuild.shared.kernel.BadRequest invalid(){return new com.metabuild.shared.kernel.BadRequest(()->"request.validation.failed","Invalid user payload");}
}
