package com.metabuild.admin.api;
import java.util.UUID;
public record AuditEvent(UUID actorId,String operation,String resourceType,String requestMethod,String requestPath,String ip,String filterSummary,long rowCount,boolean success,String traceId){}
