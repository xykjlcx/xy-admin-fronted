package com.metabuild.modules.admin.menus.application;

import java.util.List;

public interface MenuRepository { List<MenuRow> findActive(String subsystemKey); }
