package com.metabuild.admin.api;

import java.util.UUID;

/**
 * 跨域文件元数据摘要。
 */
public record FileMetadata(
        UUID id, String name, String contentType, long size, String sha256) {}
