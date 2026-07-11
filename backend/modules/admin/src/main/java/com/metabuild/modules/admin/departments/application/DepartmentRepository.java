package com.metabuild.modules.admin.departments.application;
import com.metabuild.admin.api.*; import java.util.*;
public interface DepartmentRepository {
 List<DepartmentView> tree(); Optional<DepartmentView> find(UUID id); DepartmentView create(UUID id,String name,UUID parent); DepartmentMovePreimage movePreimage(UUID id,UUID newParentId); DepartmentView patch(UUID id,DepartmentPatch patch); Set<UUID> subtree(Set<UUID> roots); BatchResult<UUID,DepartmentSummary> batchGet(Set<UUID> ids);
 record DepartmentMove(DepartmentView department, Set<UUID> affectedUserIds) { public DepartmentMove { affectedUserIds=Set.copyOf(affectedUserIds); } }
 record DepartmentMovePreimage(Set<UUID> affectedUserIds){public DepartmentMovePreimage{affectedUserIds=Set.copyOf(affectedUserIds);}}
}
