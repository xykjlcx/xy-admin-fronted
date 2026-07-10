package com.metabuilder.admin.api;

import java.time.Instant;

/**
 * 不暴露绑定细节的上传能力票据。
 */
public record UploadTicket(String token, Instant expiresAt) {}
