package com.metabuild.modules.admin.menus.persistence;

import com.metabuild.modules.admin.menus.application.MenuRepository;
import com.metabuild.modules.admin.menus.application.MenuRow;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;
import com.metabuild.shared.kernel.BadRequest;
import com.metabuild.shared.kernel.NotFound;
import org.springframework.jdbc.core.JdbcTemplate;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;

public final class JdbcMenuRepository implements MenuRepository {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public JdbcMenuRepository(JdbcTemplate jdbc,ObjectMapper json) { this.jdbc=jdbc;this.json=json; }
    @Override public List<MenuRow> findActive(String subsystemKey) {
        var rows = jdbc.query("""
                select m.id,m.source_key,m.default_parent_source_key,m.subsystem_key,m.route_key,
                       coalesce(c.parent_overridden,false) parent_overridden,c.parent_id customized_parent_id,
                       coalesce(c.label_key,m.default_label_key) label_key,coalesce(c.localized_label,m.runtime_label)::text localized_label,
                       coalesce(c.icon,m.default_icon) icon,
                       coalesce(c.sort,m.default_sort) sort_order,coalesce(c.visible,m.default_visible) visible,p.code permission,
                       m.default_path,m.default_type
                from mb_menu m left join mb_menu_customization c on c.menu_id=m.id
                left join mb_permission p on p.id=m.permission_id and p.status='ACTIVE' and p.deleted_at is null
                where m.subsystem_key=? and m.status='ACTIVE' and m.deleted_at is null
                  and (m.permission_id is null or p.id is not null)
                order by coalesce(c.sort,m.default_sort),m.id
                """, (rs,row) -> new Raw(rs.getObject("id",UUID.class), rs.getString("source_key"),
                rs.getString("default_parent_source_key"), rs.getString("subsystem_key"), rs.getString("route_key"),
                rs.getBoolean("parent_overridden"), rs.getObject("customized_parent_id",UUID.class),
                rs.getString("label_key"),localized(rs.getString("localized_label")), rs.getString("icon"), rs.getInt("sort_order"), rs.getBoolean("visible"),
                rs.getString("permission"),rs.getString("default_path"),rs.getString("default_type")), subsystemKey);
        var ids = new HashMap<String,UUID>();
        rows.forEach(row -> { if (row.sourceKey != null) ids.put(row.sourceKey,row.id); });
        return rows.stream().map(row -> new MenuRow(row.id, row.parentOverridden ? row.customizedParentId : ids.get(row.parentSourceKey), row.subsystem,
                row.type, row.label,row.localizedLabel, row.icon, row.sort, row.visible, row.path, row.permission)).toList();
    }
    @Override public MenuRow createRuntimeDirectory(UUID id,String subsystem,UUID parentId,Map<String,String> label,String icon,int sort,boolean visible){
        if(parentId!=null){Integer count=jdbc.queryForObject("select count(*) from mb_menu where id=? and subsystem_key=? and default_type='dir' and status='ACTIVE' and deleted_at is null",Integer.class,parentId,subsystem);if(count==null||count!=1)throw invalid("Runtime directory parent is invalid");}
        jdbc.update("insert into mb_menu(id,origin,subsystem_key,default_label_key,runtime_label,default_icon,default_sort,default_visible,default_type,status) values (?,'RUNTIME',?,'runtime',?::jsonb,?,?,?,'dir','ACTIVE')",id,subsystem,encode(label),icon,sort,visible);
        if(parentId!=null)jdbc.update("insert into mb_menu_customization(menu_id,parent_overridden,parent_id) values (?,true,?)",id,parentId);
        return row(id);
    }
    @Override public MenuRow customize(UUID id,UUID parentId,boolean parentOverridden,Map<String,String> label,String icon,Integer sort,Boolean visible){
        Integer exists=jdbc.queryForObject("select count(*) from mb_menu where id=? and status='ACTIVE' and deleted_at is null",Integer.class,id);if(exists==null||exists!=1)throw missing();
        if(parentOverridden&&parentId!=null){Integer valid=jdbc.queryForObject("select count(*) from mb_menu child join mb_menu parent on parent.id=? and parent.subsystem_key=child.subsystem_key and parent.default_type='dir' and parent.status='ACTIVE' where child.id=?",Integer.class,parentId,id);if(valid==null||valid!=1)throw invalid("Menu parent is invalid");}
        try{jdbc.update("insert into mb_menu_customization(menu_id,parent_overridden,parent_id,localized_label,icon,sort,visible) values (?,?,?,?::jsonb,?,?,?) on conflict(menu_id) do update set parent_overridden=excluded.parent_overridden,parent_id=excluded.parent_id,localized_label=excluded.localized_label,icon=excluded.icon,sort=excluded.sort,visible=excluded.visible,updated_at=current_timestamp",id,parentOverridden,parentId,encode(label),icon,sort,visible);}catch(org.springframework.dao.DataIntegrityViolationException failure){throw new BadRequest(()->"iam.menu.cycle","Menu parent would create a cycle");}
        return row(id);
    }
    @Override public MenuRow setVisibility(UUID id,boolean visible){Integer exists=jdbc.queryForObject("select count(*) from mb_menu where id=? and status='ACTIVE' and deleted_at is null",Integer.class,id);if(exists==null||exists!=1)throw missing();jdbc.update("insert into mb_menu_customization(menu_id,visible) values (?,?) on conflict(menu_id) do update set visible=excluded.visible,updated_at=current_timestamp",id,visible);return row(id);}
    @Override public void deleteRuntime(UUID id){int n=jdbc.update("update mb_menu set deleted_at=current_timestamp,status='DEPRECATED' where id=? and origin='RUNTIME' and deleted_at is null",id);if(n==0)throw invalid("Catalog menus cannot be deleted");}
    private MenuRow row(UUID id){return jdbc.query("select subsystem_key from mb_menu where id=?",(rs,n)->findActive(rs.getString(1)).stream().filter(row->row.id().equals(id)).findFirst().orElseThrow(JdbcMenuRepository::missing),id).stream().findFirst().orElseThrow(JdbcMenuRepository::missing);}
    private String encode(Map<String,String> value){try{return json.writeValueAsString(value);}catch(Exception e){throw invalid("Localized label is invalid");}}
    private Map<String,String> localized(String value){if(value==null)return null;try{return Map.copyOf(json.readValue(value,new TypeReference<Map<String,String>>(){}));}catch(Exception e){throw new IllegalStateException("Invalid localized menu label",e);}}
    private static BadRequest invalid(String detail){return new BadRequest(()->"iam.menu.invalid",detail);}
    private static NotFound missing(){return new NotFound(()->"iam.menu.not-found","Menu not found");}
    private record Raw(UUID id,String sourceKey,String parentSourceKey,String subsystem,String routeKey,
            boolean parentOverridden,UUID customizedParentId,String label,
            Map<String,String> localizedLabel,String icon,int sort,boolean visible,String permission,String path,String type) {}
}
