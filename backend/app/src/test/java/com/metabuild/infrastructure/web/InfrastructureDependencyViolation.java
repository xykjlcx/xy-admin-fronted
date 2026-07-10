package com.metabuild.infrastructure.web;

import com.metabuild.modules.admin.AdminModuleMarker;
import com.metabuild.modules.lastmile.LastmileModuleMarker;
import com.metabuild.schema.lastmile.LastmileSchemaMarker;
import com.metabuild.schema.platform.PlatformSchemaMarker;

public record InfrastructureDependencyViolation(
    AdminModuleMarker adminModuleMarker,
    LastmileModuleMarker lastmileModuleMarker,
    PlatformSchemaMarker platformSchemaMarker,
    LastmileSchemaMarker lastmileSchemaMarker) {}
