package com.metabuild.modules.admin.users.application;

import com.metabuild.admin.api.BatchResult;
import com.metabuild.admin.api.UserSummary;
import com.metabuild.shared.kernel.PageResult;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface UserRepository {
    PageResult<UserView> search(int page, int pageSize, String status, UUID deptId, boolean directOnly, String keyword);
    Optional<UserView> find(UUID id);
    UserView create(UUID id, String name, UUID deptId, String role, String phone, String email);
    UserView update(UUID id, UserPatch patch);
    Set<UUID> softDelete(UUID id);
    Set<UUID> disable(Set<UUID> ids);
    Set<UUID> enable(Set<UUID> ids);
    Set<UUID> moveToDepartment(Set<UUID> ids, UUID deptId);
    Set<UUID> usersInDepartments(Set<UUID> deptIds);
    BatchResult<UUID, UserSummary> batchGet(Set<UUID> ids);
}
