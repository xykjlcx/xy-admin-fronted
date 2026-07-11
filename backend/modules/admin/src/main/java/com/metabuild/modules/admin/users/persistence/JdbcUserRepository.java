package com.metabuild.modules.admin.users.persistence;

import com.metabuild.admin.api.BatchResult;
import com.metabuild.admin.api.UserSummary;
import com.metabuild.modules.admin.users.application.UserRepository;
import com.metabuild.modules.admin.users.application.UserPatch;
import com.metabuild.modules.admin.users.application.UserView;
import com.metabuild.shared.kernel.BadRequest;
import com.metabuild.shared.kernel.NotFound;
import com.metabuild.shared.kernel.PageResult;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;

public final class JdbcUserRepository implements UserRepository {
    private final JdbcTemplate jdbc;
    public JdbcUserRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    private static UserView row(ResultSet r,int n) throws SQLException { return new UserView(r.getObject("id",UUID.class),r.getString("display_name"),r.getObject("dept_id",UUID.class),r.getString("role_name"),Objects.toString(r.getString("phone"),""),Objects.toString(r.getString("email"),""),r.getString("status").toLowerCase(Locale.ROOT),r.getTimestamp("created_at").toInstant()); }
    public PageResult<UserView> search(int page,int size,String status,UUID dept,boolean direct,String keyword) {
        String where=" where u.deleted_at is null"; List<Object> a=new ArrayList<>();
        if(status!=null&&!status.equalsIgnoreCase("all")){where+=" and u.status=?";a.add(status.toUpperCase(Locale.ROOT));}
        if(dept!=null){where+=direct?" and u.dept_id=?":" and u.dept_id in (with recursive d as (select id from mb_dept where id=? union all select c.id from mb_dept c join d on c.parent_id=d.id where c.deleted_at is null) select id from d)";a.add(dept);}
        if(keyword!=null&&!keyword.isBlank()){where+=" and (u.display_name ilike ? or u.email ilike ? or u.phone ilike ?)";String k="%"+keyword.trim()+"%";a.add(k);a.add(k);a.add(k);}
        long total=jdbc.queryForObject("select count(*) from mb_user u"+where,Long.class,a.toArray());
        a.add(size);a.add((page-1)*size);
        var list=jdbc.query("select u.*,coalesce(string_agg(r.name,',' order by r.name),'') role_name from mb_user u left join mb_user_role ur on ur.user_id=u.id left join mb_role r on r.id=ur.role_id and r.deleted_at is null"+where+" group by u.id order by u.created_at desc limit ? offset ?",JdbcUserRepository::row,a.toArray());
        return new PageResult<>(list,total);
    }
    public Optional<UserView> find(UUID id){return jdbc.query("select u.*,coalesce(string_agg(r.name,',' order by r.name),'') role_name from mb_user u left join mb_user_role ur on ur.user_id=u.id left join mb_role r on r.id=ur.role_id where u.id=? and u.deleted_at is null group by u.id",JdbcUserRepository::row,id).stream().findFirst();}
    public UserView create(UUID id,String name,UUID dept,String role,String phone,String email){UUID roleId=resolveActiveRole(role);jdbc.update("insert into mb_user(id,dept_id,username,password_hash,display_name,email,phone,status) values(?,?,?,'!bootstrap-credential-unset!',?,?,?,'ACTIVE')",id,dept,email,name,email,phone);jdbc.update("insert into mb_user_role(user_id,role_id) values(?,?)",id,roleId);return find(id).orElseThrow();}
    public UserView update(UUID id,UserPatch p){if(p.empty())throw new BadRequest(()->"request.validation.failed","User patch is empty");UUID roleId=p.rolePresent()?resolveActiveRole(p.role()):null;List<String> sets=new ArrayList<>();List<Object> args=new ArrayList<>();if(p.namePresent()){sets.add("display_name=?");args.add(p.name());}if(p.deptPresent()){sets.add("dept_id=?");args.add(p.deptId());}if(p.phonePresent()){sets.add("phone=?");args.add(p.phone());}if(p.emailPresent()){sets.add("email=?");args.add(p.email());}if(p.statusPresent()){sets.add("status=?");args.add(p.status().toUpperCase(Locale.ROOT));}sets.add("updated_at=current_timestamp");args.add(id);int n=jdbc.update("update mb_user set "+String.join(",",sets)+" where id=? and deleted_at is null",args.toArray());if(n==0)throw new NotFound(()->"iam.user.not-found","User not found");if(p.rolePresent()){jdbc.update("delete from mb_user_role where user_id=?",id);jdbc.update("insert into mb_user_role(user_id,role_id) values(?,?)",id,roleId);}return find(id).orElseThrow();}
    public Set<UUID> softDelete(UUID id){return changed("update mb_user set deleted_at=current_timestamp,status='DISABLED',authz_revision=authz_revision+1 where id=? and deleted_at is null returning id",id);}
    public Set<UUID> disable(Set<UUID> ids){checkBatch(ids);return changed("update mb_user set status='DISABLED',authz_revision=authz_revision+1 where id=any(?) and deleted_at is null and status<>'DISABLED' returning id",(Object)ids.toArray(UUID[]::new));}
    public Set<UUID> moveToDepartment(Set<UUID> ids,UUID dept){checkBatch(ids);return changed("update mb_user set dept_id=?,authz_revision=authz_revision+1 where id=any(?) and deleted_at is null returning id",dept,(Object)ids.toArray(UUID[]::new));}
    public Set<UUID> usersInDepartments(Set<UUID> depts){checkBatch(depts);return Set.copyOf(jdbc.queryForList("select id from mb_user where dept_id=any(?) and deleted_at is null",UUID.class,(Object)depts.toArray(UUID[]::new)));}
    public BatchResult<UUID,UserSummary> batchGet(Set<UUID> ids){checkBatch(ids);if(ids.isEmpty())return new BatchResult<>(Map.of(),Set.of());Map<UUID,UserSummary> found=new LinkedHashMap<>();jdbc.query("select id,display_name,dept_id,status from mb_user where id=any(?) and deleted_at is null",r->{UUID id=r.getObject(1,UUID.class);found.put(id,new UserSummary(id,r.getString(2),r.getObject(3,UUID.class),"ACTIVE".equals(r.getString(4))));},(Object)ids.toArray(UUID[]::new));Set<UUID> missing=new LinkedHashSet<>(ids);missing.removeAll(found.keySet());return new BatchResult<>(found,missing);}
    private Set<UUID> changed(String sql,Object...args){return Set.copyOf(jdbc.query(sql,(r,n)->r.getObject(1,UUID.class),args));}
    private static void checkBatch(Set<UUID> ids){if(ids.size()>500)throw new IllegalArgumentException("batch size must not exceed 500");}
    private UUID resolveActiveRole(String role){List<UUID> matches=jdbc.queryForList("select id from mb_role where deleted_at is null and status='ACTIVE' and (lower(code)=lower(?) or lower(name)=lower(?))",UUID.class,role,role);if(matches.size()!=1)throw new com.metabuild.shared.kernel.BadRequest(()->"iam.user.role-invalid","Role must identify exactly one active role by code or name");return matches.getFirst();}
}
