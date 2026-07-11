package com.metabuild.modules.admin.departments.application;
import java.util.UUID;
public record DepartmentView(UUID id, UUID parentId, String name, int sort, long memberCount) {}
