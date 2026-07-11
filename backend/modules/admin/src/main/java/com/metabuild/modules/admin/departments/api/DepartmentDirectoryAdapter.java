package com.metabuild.modules.admin.departments.api;
import com.metabuild.admin.api.*; import com.metabuild.modules.admin.departments.application.DepartmentRepository; import java.util.*;
public final class DepartmentDirectoryAdapter implements DepartmentDirectoryApi {private final DepartmentRepository d;public DepartmentDirectoryAdapter(DepartmentRepository d){this.d=d;}public BatchResult<UUID,DepartmentSummary> batchGetDepartments(Set<UUID> ids){return d.batchGet(ids);}public Set<UUID> expandSubtree(Set<UUID> roots){return d.subtree(roots);}}
