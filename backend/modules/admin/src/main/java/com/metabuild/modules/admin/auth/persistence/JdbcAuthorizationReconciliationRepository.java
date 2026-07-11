package com.metabuild.modules.admin.auth.persistence;

import com.metabuild.modules.admin.auth.application.AuthorizationReconciliationPort;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

public final class JdbcAuthorizationReconciliationRepository implements AuthorizationReconciliationPort {
    private final JdbcTemplate jdbc;private final Clock clock;
    public JdbcAuthorizationReconciliationRepository(JdbcTemplate jdbc,Clock clock){this.jdbc=jdbc;this.clock=clock;}
    @Override public List<Task> claim(UUID worker,int limit,Duration lease){if(limit<1||limit>500)throw new IllegalArgumentException("bounded claim required");return jdbc.query("""
            with picked as (select id from mb_authz_refresh_outbox where (status in ('PENDING','FAILED') and next_attempt_at<=current_timestamp) or (status='PROCESSING' and lease_until<current_timestamp) order by next_attempt_at,id for update skip locked limit ?), claimed as (update mb_authz_refresh_outbox o set status='PROCESSING',worker_id=?,claimed_at=current_timestamp,lease_until=?,attempts=attempts+1 from picked where o.id=picked.id returning o.id,o.operation_id,o.user_id,o.target_revision,o.event_type,o.recovery_phase,o.attempts) select * from claimed
            """,(r,n)->new Task(r.getObject(1,UUID.class),r.getObject(2,UUID.class),r.getObject(3,UUID.class),r.getLong(4),r.getString(5),r.getString(6),worker,r.getInt(7)),limit,worker.toString(),Timestamp.from(clock.instant().plus(lease)));}
    @Override public boolean outboxExists(UUID op,UUID user){return Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from mb_authz_refresh_outbox where operation_id=? and user_id=?)",Boolean.class,op,user));}
    @Override public boolean complete(Task task){return jdbc.update("update mb_authz_refresh_outbox set status='DONE',worker_id=null,claimed_at=null,lease_until=null,processed_at=current_timestamp where id=? and status='PROCESSING' and worker_id=? and attempts=?",task.id(),task.workerId().toString(),task.attempt())==1;}
    @Override public boolean failed(Task task,String error){return jdbc.update("update mb_authz_refresh_outbox set status='FAILED',worker_id=null,claimed_at=null,lease_until=null,last_error=?,next_attempt_at=current_timestamp+interval '5 seconds' where id=? and status='PROCESSING' and worker_id=? and attempts=?",error,task.id(),task.workerId().toString(),task.attempt())==1;}
}
