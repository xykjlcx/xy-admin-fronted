package com.metabuild.modules.admin.auth.application;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

public interface AuthorizationReconciliationPort {
    List<Task> claim(UUID workerId,int limit,Duration lease);
    boolean outboxExists(UUID operationId,UUID userId);
    boolean complete(Task task);
    boolean failed(Task task,String error);
    record Task(UUID id,UUID operationId,UUID userId,long targetRevision,String eventType,
            String recoveryPhase,UUID workerId,int attempt){}
}
