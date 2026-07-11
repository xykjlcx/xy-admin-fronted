package com.metabuild.modules.admin.menus.api;

import com.metabuild.modules.admin.menus.application.MenuItem;
import java.util.List;

public interface NavigationQuery { List<MenuItem> load(String subsystem); }
