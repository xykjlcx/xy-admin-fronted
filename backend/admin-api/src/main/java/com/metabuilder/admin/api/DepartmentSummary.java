package com.metabuilder.admin.api;

import java.util.UUID;

/**
 * 跨域部门摘要。
 */
public record DepartmentSummary(UUID id, UUID parentId, String name, boolean active) {}
