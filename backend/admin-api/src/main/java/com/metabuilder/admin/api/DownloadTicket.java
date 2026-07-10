package com.metabuilder.admin.api;

import java.time.Instant;

/**
 * 不暴露绑定细节的下载能力票据。
 */
public record DownloadTicket(String token, Instant expiresAt) {}
