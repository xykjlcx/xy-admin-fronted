package com.metabuild.modules.admin.users.application;
import java.util.UUID;
public record UserPatch(boolean namePresent,String name,boolean deptPresent,UUID deptId,boolean rolePresent,String role,
        boolean phonePresent,String phone,boolean emailPresent,String email){
    public boolean empty(){return !namePresent&&!deptPresent&&!rolePresent&&!phonePresent&&!emailPresent;}
}
