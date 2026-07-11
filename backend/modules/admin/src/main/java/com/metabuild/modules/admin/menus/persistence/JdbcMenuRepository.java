package com.metabuild.modules.admin.menus.persistence;

import com.metabuild.modules.admin.menus.application.MenuRepository;
import com.metabuild.modules.admin.menus.application.MenuRow;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

public final class JdbcMenuRepository implements MenuRepository {
    private final JdbcTemplate jdbc;
    public JdbcMenuRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    @Override public List<MenuRow> findActive(String subsystemKey) {
        var rows = jdbc.query("""
                select m.id,m.source_key,m.default_parent_source_key,m.subsystem_key,m.route_key,
                       coalesce(c.parent_overridden,false) parent_overridden,c.parent_id customized_parent_id,
                       coalesce(c.label_key,m.default_label_key) label_key,coalesce(c.icon,m.default_icon) icon,
                       coalesce(c.sort,m.default_sort) sort_order,coalesce(c.visible,m.default_visible) visible,p.code permission
                from mb_menu m left join mb_menu_customization c on c.menu_id=m.id
                left join mb_permission p on p.id=m.permission_id and p.status='ACTIVE' and p.deleted_at is null
                where m.subsystem_key=? and m.status='ACTIVE' and m.deleted_at is null
                  and (m.permission_id is null or p.id is not null)
                  and (m.route_key is null or m.route_key='/admin/dashboard')
                order by coalesce(c.sort,m.default_sort),m.id
                """, (rs,row) -> new Raw(rs.getObject("id",UUID.class), rs.getString("source_key"),
                rs.getString("default_parent_source_key"), rs.getString("subsystem_key"), rs.getString("route_key"),
                rs.getBoolean("parent_overridden"), rs.getObject("customized_parent_id",UUID.class),
                rs.getString("label_key"), rs.getString("icon"), rs.getInt("sort_order"), rs.getBoolean("visible"),
                rs.getString("permission")), subsystemKey);
        var ids = new HashMap<String,UUID>();
        rows.forEach(row -> { if (row.sourceKey != null) ids.put(row.sourceKey,row.id); });
        return rows.stream().map(row -> new MenuRow(row.id, row.parentOverridden ? row.customizedParentId : ids.get(row.parentSourceKey), row.subsystem,
                row.path == null ? "dir" : "menu", row.label, row.icon, row.sort, row.visible, row.path, row.permission)).toList();
    }
    private record Raw(UUID id,String sourceKey,String parentSourceKey,String subsystem,String path,
            boolean parentOverridden,UUID customizedParentId,String label,
            String icon,int sort,boolean visible,String permission) {}
}
