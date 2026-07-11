package com.metabuild.modules.admin.menus.application;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public final class MenuTreePolicy {
    private MenuTreePolicy() {}
    public static List<MenuItem> visible(List<MenuRow> rows, Set<String> permissions, boolean systemAdmin) {
        var candidates = rows.stream().filter(MenuRow::visible).toList();
        var byId = new java.util.HashMap<UUID, MenuRow>();
        candidates.forEach(row -> byId.put(row.id(), row));
        var retained = new HashSet<UUID>();
        for (var row : candidates) {
            boolean leafAllowed = row.path() != null && (row.permission() == null || systemAdmin || permissions.contains(row.permission()));
            if (!leafAllowed) continue;
            if (!hasCompleteAncestorChain(row, byId)) continue;
            UUID cursor = row.id();
            while (cursor != null && retained.add(cursor)) {
                var current = byId.get(cursor);
                cursor = current == null ? null : current.parentId();
            }
        }
        var result = new ArrayList<MenuItem>();
        candidates.stream().filter(row -> retained.contains(row.id()))
                .sorted(Comparator.comparingInt(MenuRow::sort).thenComparing(MenuRow::id))
                .forEach(row -> result.add(new MenuItem(row.id(), row.parentId(), row.subsystemKey(), row.type(),
                        labels(row.labelKey()), row.icon(), row.path(), row.permission(), true, row.sort())));
        return List.copyOf(result);
    }
    private static boolean hasCompleteAncestorChain(MenuRow row, java.util.Map<UUID,MenuRow> byId) {
        var visited = new HashSet<UUID>();
        UUID parentId = row.parentId();
        while (parentId != null) {
            if (!visited.add(parentId)) return false;
            var parent = byId.get(parentId);
            if (parent == null || !parent.visible() || !row.subsystemKey().equals(parent.subsystemKey())) return false;
            parentId = parent.parentId();
        }
        return true;
    }
    private static Map<String,String> labels(String key) {
        return switch (key) {
            case "nav.workspace" -> Map.of("zh-CN","工作台","en-US","Workspace");
            case "nav.organization" -> Map.of("zh-CN","组织与权限","en-US","Organization & Access");
            case "nav.dashboard" -> Map.of("zh-CN","企业概览","en-US","Overview");
            case "nav.users" -> Map.of("zh-CN","成员与部门","en-US","Members & Departments");
            case "nav.roles" -> Map.of("zh-CN","角色与权限","en-US","Roles & Permissions");
            case "nav.menus" -> Map.of("zh-CN","菜单管理","en-US","Menu Management");
            default -> Map.of("zh-CN",key,"en-US",key);
        };
    }
}
