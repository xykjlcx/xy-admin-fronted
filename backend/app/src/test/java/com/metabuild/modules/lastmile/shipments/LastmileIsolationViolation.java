package com.metabuild.modules.lastmile.shipments;

import com.metabuild.modules.admin.AdminModuleMarker;
import com.metabuild.schema.platform.PlatformSchemaMarker;

public record LastmileIsolationViolation(
    AdminModuleMarker adminModuleMarker,
    PlatformSchemaMarker platformSchemaMarker) {}
