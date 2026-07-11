package com.metabuild.modules.admin.menus.controller;

import com.metabuild.modules.admin.menus.application.MenuItem;
import com.metabuild.modules.admin.menus.api.NavigationQuery;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/menus")
public final class MenuController {
    private final NavigationQuery menus;
    public MenuController(NavigationQuery menus) { this.menus=menus; }
    @GetMapping public List<MenuItem> list(@RequestParam String subsystem) { return menus.load(subsystem); }
}
