package com.metabuild.modules.admin.messages.controller;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.metabuild.modules.admin.auth.api.CurrentAuthorizationProvider;

@RestController
@RequestMapping("/api/messages")
public final class ShellMessageController {
    private final CurrentAuthorizationProvider authorization;
    public ShellMessageController(CurrentAuthorizationProvider authorization) { this.authorization=authorization; }
    @GetMapping public Map<String,Object> list(@RequestParam(defaultValue = "all") String status) {
        // Shell unread badge is authenticated baseline data; it deliberately has no business permission gate.
        authorization.current();
        return Map.of("list", List.of(), "unreadCount", 0);
    }
}
