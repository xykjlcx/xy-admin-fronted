package com.metabuild.modules.admin.menus.application;

import java.util.List;
import java.util.UUID;

public interface MenuRepository {
    List<MenuRow> findActive(String subsystemKey);
    MenuRow createRuntimeDirectory(UUID id,String subsystem,UUID parentId,java.util.Map<String,String> label,String icon,int sort,boolean visible);
    MenuRow customize(UUID id,UUID parentId,boolean parentOverridden,java.util.Map<String,String> label,String icon,Integer sort,Boolean visible);
    MenuRow setVisibility(UUID id,boolean visible);
    void deleteRuntime(UUID id);
}
