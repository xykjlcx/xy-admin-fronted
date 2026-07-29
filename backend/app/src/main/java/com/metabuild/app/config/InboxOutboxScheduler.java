package com.metabuild.app.config;
import com.metabuild.modules.admin.messages.persistence.InboxPublishOutboxWorker;import org.springframework.scheduling.annotation.Scheduled;
final class InboxOutboxScheduler {private final InboxPublishOutboxWorker worker;InboxOutboxScheduler(InboxPublishOutboxWorker worker){this.worker=worker;}@Scheduled(fixedDelayString="${metabuilder.messages.outbox-poll-ms:1000}")void poll(){worker.drain();}}
