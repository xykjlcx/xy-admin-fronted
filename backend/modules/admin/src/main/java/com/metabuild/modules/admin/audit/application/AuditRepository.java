package com.metabuild.modules.admin.audit.application;
public interface AuditRepository {AuditPage<OperationLogView> operations(AuditFilter filter);AuditPage<LoginLogView> logins(AuditFilter filter);}
