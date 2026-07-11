package com.metabuild.modules.admin.auth.persistence;

import com.metabuild.modules.admin.auth.api.AuthorizationRefreshService;
import com.metabuild.modules.admin.auth.application.AuthorizationGraphRepository;
import com.metabuild.modules.admin.auth.application.AuthorizationRefreshPort;
import com.metabuild.modules.admin.auth.application.AuthorizationSnapshotCompiler;
import com.metabuild.shared.kernel.UuidV7Generator;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

public final class JdbcAuthorizationRefreshRepository implements AuthorizationRefreshPort {
    private static final long AUTHZ_GRAPH_LOCK = 0x4d425f41555A5448L;
    private static final long CATALOG_SEED_LOCK = 0x4d425f434154414cL;
    private final JdbcTemplate jdbc; private final TransactionTemplate transactions;
    private final AuthorizationGraphRepository graphs; private final AuthorizationSnapshotCompiler compiler;
    private final UuidV7Generator ids; private final Clock clock;
    public JdbcAuthorizationRefreshRepository(JdbcTemplate jdbc,PlatformTransactionManager manager,
            AuthorizationGraphRepository graphs,AuthorizationSnapshotCompiler compiler,UuidV7Generator ids,Clock clock){
        this.jdbc=jdbc;this.transactions=new TransactionTemplate(manager);this.graphs=graphs;this.compiler=compiler;this.ids=ids;this.clock=clock;
    }
    @Override public <T>T inTransaction(TransactionWork<T> work){return transactions.execute(status->work.run());}
    @Override public void lockCatalogSeed(){jdbc.query("select pg_advisory_xact_lock(?)",ps->ps.setLong(1,CATALOG_SEED_LOCK),rs->null);}
    @Override public void lockAuthzGraph(){jdbc.query("select pg_advisory_xact_lock(?)",ps->ps.setLong(1,AUTHZ_GRAPH_LOCK),rs->null);}
    @Override public Map<UUID,Long> revisions(Set<UUID> users){
        if(users.isEmpty())return Map.of();
        var result=new LinkedHashMap<UUID,Long>();
        jdbc.query("select id,authz_revision from mb_user where id=any(?::uuid[]) and deleted_at is null for update",
                ps->ps.setArray(1,ps.getConnection().createArrayOf("uuid",users.toArray())),rs->{result.put(rs.getObject(1,UUID.class),rs.getLong(2));});
        if(result.size()!=users.size())throw new IllegalArgumentException("Affected user missing");
        return Map.copyOf(result);
    }
    @Override public Map<UUID,Long> incrementRevisions(Set<UUID> users){
        if(users.isEmpty())return Map.of();
        var result=new LinkedHashMap<UUID,Long>();
        jdbc.query("update mb_user set authz_revision=authz_revision+1,updated_at=current_timestamp where id=any(?::uuid[]) returning id,authz_revision",
                ps->ps.setArray(1,ps.getConnection().createArrayOf("uuid",users.toArray())),rs->{result.put(rs.getObject(1,UUID.class),rs.getLong(2));});
        return Map.copyOf(result);
    }
    @Override public void appendRefreshOutbox(UUID operationId,Map<UUID,Long> revisions,AuthorizationRefreshService.Cause cause){
        jdbc.batchUpdate("insert into mb_authz_refresh_outbox(id,operation_id,user_id,target_revision,event_type,status,recovery_payload) values (?,?,?,?, 'REFRESH','PENDING',?::jsonb)",
                revisions.entrySet(),revisions.size(),(ps,e)->{ps.setObject(1,ids.generate());ps.setObject(2,operationId);ps.setObject(3,e.getKey());ps.setLong(4,e.getValue());ps.setString(5,"{\"cause\":\""+cause.name()+"\"}");});
    }
    @Override public void appendTerminalOutbox(UUID operationId,Map<UUID,Long> revisions,AuthorizationRefreshService.TerminalAction action){
        jdbc.batchUpdate("insert into mb_authz_refresh_outbox(id,operation_id,user_id,target_revision,event_type,status,recovery_phase,recovery_payload) values (?,?,?,?, 'LOGOUT_ALL','PENDING','FENCED',?::jsonb)",revisions.entrySet(),revisions.size(),(ps,e)->{ps.setObject(1,ids.generate());ps.setObject(2,operationId);ps.setObject(3,e.getKey());ps.setLong(4,e.getValue());ps.setString(5,"{\"action\":\""+action.name()+"\"}");});
    }
    @Override public Map<UUID,AuthorizationSnapshot> compileSnapshots(Set<UUID> users){
        var result=new LinkedHashMap<UUID,AuthorizationSnapshot>();
        graphs.loadAll(users).forEach((id,graph)->result.put(id,compiler.compile(graph,clock.instant())));
        if(result.size()!=users.size())throw new IllegalStateException("Authorization graph incomplete");
        return Map.copyOf(result);
    }
    @Override public void markDone(UUID operationId,Set<UUID> users){
        jdbc.update("update mb_authz_refresh_outbox set status='DONE',worker_id=null,claimed_at=null,lease_until=null,processed_at=current_timestamp where operation_id=? and user_id=any(?::uuid[])",
                ps->{ps.setObject(1,operationId);ps.setArray(2,ps.getConnection().createArrayOf("uuid",users.toArray()));});
    }
}
