package com.metabuild.infrastructure.jooq;

public interface SystemDataScopeAuditPort {
    /** 必须持久化成功后返回；抛异常则不得开启 bypass。 */
    java.util.UUID begin(String reason, com.metabuild.infrastructure.security.SystemTaskIdentity identity);
    void complete(java.util.UUID auditId, boolean success, String outcome);
}
