package com.metabuild.modules.admin.roles.application;
import java.util.UUID;
public record RoleView(UUID id,String name,String type,String desc,UUID memberDeptId) {}
