package com.metabuild.modules.admin.subsystems.controller;

import com.metabuild.modules.admin.menus.api.NavigationQuery;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/subsystems")
public final class SubsystemController {
    private final NavigationQuery menus;
    public SubsystemController(NavigationQuery menus) { this.menus=menus; }
    @GetMapping public List<SubsystemResponse> list() {
        if (menus.load("admin").isEmpty()) return List.of();
        return List.of(new SubsystemResponse("admin", Map.of("zh-CN","后台管理","en-US","Admin"),
                Map.of("zh-CN","组织 · 权限 · 审计","en-US","Org · IAM · Audit"), "layout-grid", "#3370ff",
                "/admin/dashboard", true, true, 1));
    }
    public record SubsystemResponse(String key, Map<String,String> label, Map<String,String> desc, String icon,
            String color, String home, boolean builtin, boolean enabled, int sort) {}
}
