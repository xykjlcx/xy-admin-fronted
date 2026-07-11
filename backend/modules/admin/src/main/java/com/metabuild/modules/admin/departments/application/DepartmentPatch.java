package com.metabuild.modules.admin.departments.application;
import java.util.UUID;
public record DepartmentPatch(boolean namePresent,String name,boolean parentPresent,UUID parentId){public boolean empty(){return !namePresent&&!parentPresent;}}
