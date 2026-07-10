package com.metabuilder.admin.api;

import java.util.Set;
import java.util.UUID;

/**
 * 用户目录查询端口。
 */
public interface UserDirectoryApi {

    BatchResult<UUID, UserSummary> batchGetUsers(Set<UUID> userIds);
}
