package com.metabuild.modules.admin.audit.persistence;

import com.metabuild.modules.admin.audit.application.*;
import java.time.*;
import java.util.*;
import org.jooq.*;
import org.jooq.impl.DSL;

public final class JooqAuditRepository implements AuditRepository {
  private final DSLContext db;
  private final ZoneId zone;
  public JooqAuditRepository(DSLContext db){this(db,ZoneId.of("Asia/Shanghai"));}
  public JooqAuditRepository(DSLContext db,ZoneId zone){this.db=db;this.zone=zone;}

  public AuditPage<OperationLogView> operations(AuditFilter f){
    Condition c=operationCondition(f);
    Table<?> source=DSL.table("mb_operation_log").leftJoin(DSL.table("mb_user"))
        .on(DSL.field("mb_user.id").eq(DSL.field("mb_operation_log.actor_id")));
    long total=db.fetchCount(source,c);
    var rows=db.select(DSL.field("mb_operation_log.id"),DSL.field("mb_operation_log.created_at"),
            DSL.field("mb_user.display_name"),DSL.field("mb_operation_log.operation"),
            DSL.field("mb_operation_log.resource_type"),DSL.field("mb_operation_log.resource_id"),
            DSL.field("mb_operation_log.request_path"),DSL.field("mb_operation_log.detail->>'ip'",String.class))
        .from(source).where(c).orderBy(DSL.field("mb_operation_log.created_at").desc())
        .limit(f.size()).offset((f.page()-1)*f.size())
        .fetch(r->new OperationLogView(String.valueOf(r.get(0)),String.valueOf(r.get(1)),
            Objects.toString(r.get(2),"System"),type(Objects.toString(r.get(3),"")),
            Objects.toString(r.get(4),"system"),target(r.get(4),r.get(5),r.get(6)),Objects.toString(r.get(7),"")));
    return new AuditPage<>(rows,total);
  }

  public AuditPage<LoginLogView> logins(AuditFilter f){
    Condition c=loginCondition(f);long total=db.fetchCount(DSL.table("mb_login_log"),c);
    var rows=db.select(DSL.field("id"),DSL.field("created_at"),DSL.field("username"),DSL.field("success"),
            DSL.field("host(ip_address)",String.class).as("ip"),DSL.field("user_agent"))
        .from("mb_login_log").where(c).orderBy(DSL.field("created_at").desc())
        .limit(f.size()).offset((f.page()-1)*f.size())
        .fetch(r->new LoginLogView(String.valueOf(r.get("id")),String.valueOf(r.get("created_at")),
            r.get("username",String.class),Boolean.TRUE.equals(r.get("success",Boolean.class))?"ok":"fail",
            Objects.toString(r.get("ip"),""),"Unknown",Objects.toString(r.get("user_agent"),"Unknown")));
    return new AuditPage<>(rows,total);
  }

  private Condition operationCondition(AuditFilter f){Condition c=DSL.trueCondition();if(!blank(f.keyword())){String q="%"+f.keyword().toLowerCase(Locale.ROOT)+"%";c=c.and(DSL.condition("(lower(coalesce(mb_user.display_name,'')) like ? or lower(mb_operation_log.operation) like ? or lower(mb_operation_log.resource_type) like ? or cast(mb_operation_log.resource_id as text) like ?)",q,q,q,q));}if(!"all".equals(f.discriminator()))c=c.and(typeCondition(f.discriminator()));return dates(c,"mb_operation_log.created_at",f);}
  private Condition loginCondition(AuditFilter f){Condition c=DSL.trueCondition();if(!blank(f.keyword())){String q="%"+f.keyword().toLowerCase(Locale.ROOT)+"%";c=c.and(DSL.condition("(lower(username) like ? or lower(coalesce(user_agent,'')) like ? or coalesce(host(ip_address),'') like ?)",q,q,q));}if(!"all".equals(f.discriminator()))c=c.and(DSL.field("success",Boolean.class).eq("ok".equals(f.discriminator())));return dates(c,"created_at",f);}
  private Condition dates(Condition c,String field,AuditFilter f){if(f.startDate()!=null)c=c.and(DSL.field(field,OffsetDateTime.class).ge(f.startDate().atStartOfDay(zone).toOffsetDateTime()));if(f.endDate()!=null)c=c.and(DSL.field(field,OffsetDateTime.class).lt(f.endDate().plusDays(1).atStartOfDay(zone).toOffsetDateTime()));return c;}
  private static Condition typeCondition(String t){return switch(t){case "create"->DSL.condition("operation ~ '(create|upload|publish)$'");case "edit"->DSL.condition("operation ~ '(update|edit|patch|rename)$'");case "del"->DSL.condition("operation ~ '(delete|remove)$'");case "export"->DSL.condition("operation like '%export%'");case "perm"->DSL.condition("operation like '%permission%' or operation like '%role%'");case "config"->DSL.condition("operation like '%config%' or operation like '%setting%'");default->DSL.falseCondition();};}
  private static String type(String op){if(op.matches(".*(create|upload|publish)$"))return "create";if(op.matches(".*(delete|remove)$"))return "del";if(op.contains("export"))return "export";if(op.contains("permission")||op.contains("role"))return "perm";if(op.contains("config")||op.contains("setting"))return "config";return "edit";}
  private static String target(Object resource,Object id,Object path){return id==null?Objects.toString(path,Objects.toString(resource,"")):Objects.toString(resource,"")+":"+id;}
  private static boolean blank(String x){return x==null||x.isBlank();}
}
