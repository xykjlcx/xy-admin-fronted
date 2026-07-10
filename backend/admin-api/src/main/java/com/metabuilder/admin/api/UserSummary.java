package com.metabuilder.admin.api;

import java.util.UUID;

/**
 * 跨域用户摘要。
 */
public record UserSummary(UUID id, String displayName, UUID deptId, boolean active) {}
