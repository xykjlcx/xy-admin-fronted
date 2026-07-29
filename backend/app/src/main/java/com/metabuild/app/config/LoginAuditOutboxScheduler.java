package com.metabuild.app.config;
import com.metabuild.modules.admin.audit.persistence.LoginAuditOutboxWorker;import org.springframework.scheduling.annotation.Scheduled;
final class LoginAuditOutboxScheduler {private final LoginAuditOutboxWorker worker;LoginAuditOutboxScheduler(LoginAuditOutboxWorker worker){this.worker=worker;}@Scheduled(fixedDelayString="${metabuilder.audit.login-outbox-poll-ms:1000}")void poll(){worker.drain();}}
