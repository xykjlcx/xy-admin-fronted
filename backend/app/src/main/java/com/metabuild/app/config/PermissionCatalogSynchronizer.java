package com.metabuild.app.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.metabuild.modules.admin.auth.api.AuthorizationRefreshService;
import com.metabuild.shared.kernel.UuidV7Generator;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;

/** 在应用开放流量前，将前端声明生成的权限目录原子同步到数据库。 */
public final class PermissionCatalogSynchronizer {
  private final JdbcTemplate jdbc;
  private final AuthorizationRefreshService refresh;
  private final UuidV7Generator ids;
  private final Catalog catalog;

  public PermissionCatalogSynchronizer(JdbcTemplate jdbc,
      AuthorizationRefreshService refresh, UuidV7Generator ids, ObjectMapper json) {
    this(jdbc,refresh,ids,readCatalog(json, "permissions/permission-catalog.json", "permissions/menu-seed.json"));
  }
  PermissionCatalogSynchronizer(JdbcTemplate jdbc,AuthorizationRefreshService refresh,UuidV7Generator ids,Catalog catalog){
    this.jdbc = jdbc;
    this.refresh = refresh;
    this.ids = ids;
    this.catalog = catalog;
    validateMenuDag(catalog.menus());
  }
  static void validateMenuDag(List<Menu> menus){var bySource=new java.util.HashMap<String,Menu>();for(Menu menu:menus)if(bySource.put(menu.sourceKey(),menu)!=null)throw new IllegalStateException("Duplicate menu sourceKey: "+menu.sourceKey());var done=new java.util.HashSet<String>();var visiting=new java.util.HashSet<String>();for(String source:bySource.keySet())visitMenu(source,bySource,done,visiting);}
  private static void visitMenu(String source,java.util.Map<String,Menu> menus,Set<String> done,Set<String> visiting){if(done.contains(source))return;if(!visiting.add(source))throw new IllegalStateException("Catalog menu parent cycle: "+source);String parent=menus.get(source).parentSourceKey();if(parent!=null){if(!menus.containsKey(parent))throw new IllegalStateException("Catalog menu parent missing: "+source);visitMenu(parent,menus,done,visiting);}visiting.remove(source);done.add(source);}

  public void synchronize() {
      refresh.executeCatalog(AuthorizationRefreshService.Cause.GRANT_CHANGED,
          new AuthorizationRefreshService.AuthorizationChange<>() {
            @Override public Set<UUID> affectedUserIds() {
              if(alreadyApplied())return Set.of();
              validateRenames();return affectedUsers();
            }
            @Override public Void mutate() { if(!alreadyApplied())apply(); return null; }
          });
  }

  private boolean alreadyApplied() {
    Integer count = jdbc.queryForObject(
        "select count(*) from mb_permission_catalog_version where version=? and digest=?",
        Integer.class, catalog.version(), catalog.digest());
    return count != null && count == 1;
  }

  private void validateRenames() {
    for (Permission item : catalog.permissions()) {
      List<String> old = jdbc.query("select code from mb_permission where source_key=? and deleted_at is null and code<>?",
          (rs, row) -> rs.getString(1), item.sourceKey(), item.code());
      for (String oldCode : old) {
        if (!item.aliases().contains(oldCode)) {
          throw new IllegalStateException("Permission rename requires explicit alias: " + oldCode + " -> " + item.code());
        }
      }
    }
  }

  private Set<UUID> affectedUsers() {
    var sourceKeys = catalog.permissions().stream().map(Permission::sourceKey).toArray(String[]::new);
    if (sourceKeys.length == 0) return Set.of();
    return Set.copyOf(jdbc.query("""
        select distinct ur.user_id
        from mb_user_role ur join mb_user u on u.id=ur.user_id and u.status='ACTIVE' and u.deleted_at is null
        join mb_role r on r.id=ur.role_id and r.status='ACTIVE' and r.deleted_at is null
        join mb_role_permission rp on rp.role_id=ur.role_id
        join mb_permission p on p.id=rp.permission_id
        where p.status='ACTIVE' and (not (p.source_key=any(?::varchar[]))
          or exists (select 1 from unnest(?::varchar[], ?::varchar[]) x(source_key,code)
                     where x.source_key=p.source_key and x.code<>p.code))
        """, ps -> {
          ps.setArray(1, ps.getConnection().createArrayOf("varchar", sourceKeys));
          ps.setArray(2, ps.getConnection().createArrayOf("varchar", sourceKeys));
          ps.setArray(3, ps.getConnection().createArrayOf("varchar",
              catalog.permissions().stream().map(Permission::code).toArray(String[]::new)));
        }, (rs, row) -> rs.getObject(1, UUID.class)));
  }

  private void apply() {
    String version = Integer.toString(catalog.version());
    for (Permission item : catalog.permissions()) {
      UUID id = jdbc.query("select id from mb_permission where source_key=? and deleted_at is null",
          ps -> ps.setString(1, item.sourceKey()), rs -> rs.next() ? rs.getObject(1, UUID.class) : null);
      if (id == null) {
        id = ids.generate();
        jdbc.update("insert into mb_permission(id,source_key,code,kind,status,first_seen_version,last_seen_version) values (?,?,?,?, 'ACTIVE',?,?)",
            id, item.sourceKey(), item.code(), item.kind(), version, version);
      } else {
        jdbc.update("update mb_permission set code=?,kind=?,status='ACTIVE',last_seen_version=?,updated_at=current_timestamp where id=?",
            item.code(), item.kind(), version, id);
      }
      for (String alias : item.aliases()) {
        jdbc.update("insert into mb_permission_alias(old_code,permission_id,catalog_version) values (?,?,?) on conflict(old_code) do update set permission_id=excluded.permission_id,catalog_version=excluded.catalog_version",
            alias, id, catalog.version());
      }
    }
    String[] sources = catalog.permissions().stream().map(Permission::sourceKey).toArray(String[]::new);
    jdbc.update("update mb_permission set status='DEPRECATED',last_seen_version=?,updated_at=current_timestamp where status='ACTIVE' and not (source_key=any(?::varchar[]))",
        ps -> { ps.setString(1, version); ps.setArray(2, ps.getConnection().createArrayOf("varchar", sources)); });

    for (Menu menu : catalog.menus()) upsertMenu(menu);
    String[] menuSources = catalog.menus().stream().map(Menu::sourceKey).toArray(String[]::new);
    jdbc.update("update mb_menu set status='DEPRECATED',updated_at=current_timestamp where origin='CATALOG' and status='ACTIVE' and not (source_key=any(?::varchar[]))",
        ps -> ps.setArray(1, ps.getConnection().createArrayOf("varchar", menuSources)));
    jdbc.update("insert into mb_permission_catalog_version(version,digest) values (?,?)", catalog.version(), catalog.digest());
  }

  private void upsertMenu(Menu menu) {
    UUID permissionId = menu.permission() == null ? null : jdbc.queryForObject(
        "select id from mb_permission where code=? and status='ACTIVE' and deleted_at is null", UUID.class, menu.permission());
    int updated = jdbc.update("""
        update mb_menu set subsystem_key=?,route_key=?,permission_id=?,default_parent_source_key=?,
          default_label_key=?,default_icon=?,default_sort=?,default_visible=?,default_path=?,default_type=?,
          status='ACTIVE',updated_at=current_timestamp where source_key=? and origin='CATALOG' and deleted_at is null
        """, menu.subsystemKey(), menu.routeKey(), permissionId, menu.parentSourceKey(), menu.labelKey(),
        menu.icon(), menu.sort(), menu.visible(), menu.path(), menu.type(), menu.sourceKey());
    if (updated == 0) jdbc.update("""
        insert into mb_menu(id,source_key,origin,subsystem_key,route_key,permission_id,default_parent_source_key,
          default_label_key,default_icon,default_sort,default_visible,default_path,default_type,status)
        values (?,?,'CATALOG',?,?,?,?,?,?,?,?,?,?,'ACTIVE')
        """, ids.generate(), menu.sourceKey(), menu.subsystemKey(), menu.routeKey(), permissionId,
        menu.parentSourceKey(), menu.labelKey(), menu.icon(), menu.sort(), menu.visible(), menu.path(), menu.type());
  }

  static Catalog readCatalog(ObjectMapper json, String permissionPath, String menuPath) {
    try {
      byte[] permissionBytes = read(permissionPath);
      byte[] menuBytes = read(menuPath);
      JsonNode permissionRoot = json.readTree(permissionBytes);
      JsonNode menuRoot = json.readTree(menuBytes);
      int version = permissionRoot.path("version").asInt();
      if (version <= 0 || menuRoot.path("version").asInt() != version) throw new IllegalStateException("Catalog versions differ");
      List<Permission> permissions = new ArrayList<>();
      for (JsonNode node : permissionRoot.path("items")) {
        List<String> aliases = new ArrayList<>();
        node.path("aliases").forEach(value -> aliases.add(value.asText()));
        permissions.add(new Permission(node.path("sourceKey").asText(), node.path("code").asText(),
            node.path("kind").asText(), List.copyOf(aliases)));
      }
      List<Menu> menus = new ArrayList<>();
      for (JsonNode node : menuRoot.path("items")) menus.add(new Menu(node.path("sourceKey").asText(),
          text(node, "subsystemKey"), text(node, "routeKey"), text(node, "path"), text(node, "type"),
          text(node, "permission"), text(node, "parentSourceKey"), text(node, "labelKey"), text(node, "icon"),
          node.path("sort").asInt(), node.path("visible").asBoolean()));
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      digest.update(permissionBytes);
      digest.update((byte) '\n');
      digest.update(menuBytes);
      return new Catalog(version, HexFormat.of().formatHex(digest.digest()), List.copyOf(permissions), List.copyOf(menus));
    } catch (IOException | NoSuchAlgorithmException failure) {
      throw new IllegalStateException("Cannot read permission catalog", failure);
    }
  }

  private static byte[] read(String path) throws IOException {
    try (InputStream input = new ClassPathResource(path).getInputStream()) { return input.readAllBytes(); }
  }
  private static String text(JsonNode node, String field) { return node.path(field).isNull() ? null : node.path(field).asText(null); }

  record Catalog(int version, String digest, List<Permission> permissions, List<Menu> menus) {}
  record Permission(String sourceKey, String code, String kind, List<String> aliases) {}
  record Menu(String sourceKey, String subsystemKey, String routeKey, String path, String type,
              String permission, String parentSourceKey, String labelKey, String icon, int sort, boolean visible) {}
}
