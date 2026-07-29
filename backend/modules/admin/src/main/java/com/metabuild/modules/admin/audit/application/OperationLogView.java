package com.metabuild.modules.admin.audit.application;
public record OperationLogView(String id,String occurredAt,String operator,String type,String module,String target,String ip) {}
