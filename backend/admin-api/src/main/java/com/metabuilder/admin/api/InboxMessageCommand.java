package com.metabuilder.admin.api;

import java.util.UUID;

/**
 * 可幂等发布的站内信命令。
 */
public record InboxMessageCommand(
        String idempotencyKey,
        UUID recipientUserId,
        String category,
        String titleKey,
        String body,
        String link) {}
