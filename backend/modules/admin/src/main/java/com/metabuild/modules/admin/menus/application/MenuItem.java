package com.metabuild.modules.admin.menus.application;

import java.util.Map;
import java.util.UUID;

public record MenuItem(UUID id,
        @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.ALWAYS) UUID parentId,
        String subsystemKey, String type, Map<String,String> label,
        String icon, String path, String permission, boolean visible, int sort) {}
