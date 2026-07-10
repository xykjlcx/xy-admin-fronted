package com.metabuilder.admin.api;

import java.util.Set;
import java.util.UUID;

/**
 * 部门目录查询端口。
 */
public interface DepartmentDirectoryApi {

    BatchResult<UUID, DepartmentSummary> batchGetDepartments(Set<UUID> deptIds);

    Set<UUID> expandSubtree(Set<UUID> rootDeptIds);
}
