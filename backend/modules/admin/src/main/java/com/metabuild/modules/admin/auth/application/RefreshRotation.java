package com.metabuild.modules.admin.auth.application;

import java.util.UUID;

public record RefreshRotation(UUID userId, String token) {}
