package com.metabuild.infrastructure.jooq;

import com.metabuild.infrastructure.security.SystemTaskIdentity;
import com.metabuild.shared.kernel.UuidV7Generator;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

public final class JdbcSystemDataScopeAuditAdapter implements SystemDataScopeAuditPort {
    private final JdbcTemplate jdbc;
    private final UuidV7Generator ids;
    private final org.springframework.transaction.support.TransactionTemplate requiresNew;
    public JdbcSystemDataScopeAuditAdapter(JdbcTemplate jdbc, UuidV7Generator ids,org.springframework.transaction.PlatformTransactionManager tx) {
        this.jdbc=jdbc;this.ids=ids;this.requiresNew=new org.springframework.transaction.support.TransactionTemplate(tx);
        this.requiresNew.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }
    @Override public UUID begin(String reason, SystemTaskIdentity identity) {
        UUID id=ids.generate();
        requiresNew.executeWithoutResult(status->jdbc.update("insert into mb_operation_log(id,actor_id,operation,resource_type,success,detail) values (?,?,?,?,false,cast(? as jsonb))",
                id,identity.actorId(),"data-scope.system-bypass","system-task", "{\"status\":\"ATTEMPTED\",\"reason\":\""+escape(reason)+"\"}"));
        return id;
    }
    @Override public void complete(UUID id,boolean success,String outcome){
        requiresNew.executeWithoutResult(status->jdbc.update("update mb_operation_log set success=?,detail=detail || cast(? as jsonb) where id=?",
                success,"{\"outcome\":\""+escape(outcome)+"\"}",id));
    }
    private static String escape(String value){return value.replace("\\","\\\\").replace("\"","\\\"");}
}
