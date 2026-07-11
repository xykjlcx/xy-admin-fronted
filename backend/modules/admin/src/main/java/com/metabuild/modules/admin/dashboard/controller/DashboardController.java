package com.metabuild.modules.admin.dashboard.controller;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.metabuild.modules.admin.auth.api.CurrentAuthorizationProvider;
import com.metabuild.shared.kernel.Forbidden;
import com.metabuild.admin.api.security.RequiresPermissions;

@RestController
@RequestMapping("/api/dashboard")
public final class DashboardController {
    private final CurrentAuthorizationProvider authorization;
    public DashboardController(CurrentAuthorizationProvider authorization) { this.authorization=authorization; }
    @GetMapping("/overview")
    @RequiresPermissions(codes = "dashboard:overview:view")
    public Map<String,Object> overview() {
        var current = authorization.current();
        if (!current.systemAdmin() && !current.permissions().contains("dashboard:overview:view"))
            throw new Forbidden(() -> "auth.permission.denied", "Dashboard permission required");
        return Map.of(
                "company", Map.of("mark","M","name","MetaBuilder","status","运行中","meta","P1 real backend"),
                "metrics", Map.of(
                        "newMembers", metric("1"), "activeUsers", metric("1"),
                        "newRoles", metric("1"), "auditLogs", metric("0")),
                "todo", Map.of(
                        "stats", Map.of("pending",stat("0","待办任务"),"done",stat("0","已完成"),"overdue",stat("0","未完成")),
                        "items", Map.of(
                                "phone",item("暂无待办","--","待处理"),
                                "onboard",item("暂无入职任务","--","待处理"),
                                "interview",item("暂无面试任务","--","待处理"))));
    }
    private static Map<String,Object> metric(String value) { return Map.of("value",value,"delta","0","negative",false); }
    private static Map<String,String> stat(String value,String label) { return Map.of("value",value,"label",label); }
    private static Map<String,String> item(String title,String time,String status) { return Map.of("title",title,"time",time,"status",status); }
}
