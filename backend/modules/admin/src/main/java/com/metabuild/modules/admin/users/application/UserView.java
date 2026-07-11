package com.metabuild.modules.admin.users.application;

import java.time.Instant;
import java.util.UUID;

public record UserView(UUID id, String name, UUID deptId, String role, String phone, String email,
                       String status, Instant joinedAt) {}
