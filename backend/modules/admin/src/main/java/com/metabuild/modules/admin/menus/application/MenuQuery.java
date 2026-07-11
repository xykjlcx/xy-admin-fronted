package com.metabuild.modules.admin.menus.application;

import com.metabuild.modules.admin.auth.api.CurrentAuthorizationProvider;
import com.metabuild.modules.admin.menus.api.NavigationQuery;
import com.metabuild.shared.kernel.BadRequest;
import java.util.List;

public final class MenuQuery implements NavigationQuery {
    private final MenuRepository menus;
    private final CurrentAuthorizationProvider authorization;
    public MenuQuery(MenuRepository menus, CurrentAuthorizationProvider authorization) {
        this.menus=menus; this.authorization=authorization;
    }
    public List<MenuItem> load(String subsystem) {
        if (!"admin".equals(subsystem)) throw new BadRequest(() -> "menu.subsystem.invalid", "Unknown subsystem");
        var snapshot = authorization.current();
        return MenuTreePolicy.visible(menus.findActive(subsystem), snapshot.permissions(), snapshot.systemAdmin());
    }
}
