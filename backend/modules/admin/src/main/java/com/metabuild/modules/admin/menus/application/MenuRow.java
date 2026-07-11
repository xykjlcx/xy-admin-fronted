package com.metabuild.modules.admin.menus.application;

import java.util.UUID;

public record MenuRow(UUID id, UUID parentId, String subsystemKey, String type, String labelKey,java.util.Map<String,String> localizedLabel,
        String icon, int sort, boolean visible, String path, String permission) {
    public static MenuRow directory(UUID id, UUID parentId, String subsystem, String label, String icon, int sort, boolean visible) {
        return new MenuRow(id,parentId,subsystem,"dir",label,null,icon,sort,visible,null,null);
    }
    public static MenuRow page(UUID id, UUID parentId, String subsystem, String label, String icon, int sort,
            boolean visible, String path, String permission) {
        return new MenuRow(id,parentId,subsystem,"menu",label,null,icon,sort,visible,path,permission);
    }
}
