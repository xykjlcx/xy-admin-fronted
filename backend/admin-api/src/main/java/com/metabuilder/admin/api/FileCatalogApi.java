package com.metabuilder.admin.api;

import java.util.Set;
import java.util.UUID;

/**
 * 文件目录与下载能力端口。
 */
public interface FileCatalogApi {

    BatchResult<UUID, FileMetadata> batchGetMetadata(Set<UUID> fileIds);

    DownloadTicket issueDownloadTicket(UUID fileId, UUID actorId, String purpose);
}
