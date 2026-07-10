package com.metabuild.shared.kernel.fixture;

import com.metabuild.app.MetaBuilderApplicationMarker;
import com.metabuild.infrastructure.InfrastructureMarker;
import com.metabuild.modules.admin.AdminModuleMarker;
import com.metabuild.modules.lastmile.LastmileModuleMarker;

public record CoreReverseDependencyViolation(
    MetaBuilderApplicationMarker applicationMarker,
    InfrastructureMarker infrastructureMarker,
    AdminModuleMarker adminModuleMarker,
    LastmileModuleMarker lastmileModuleMarker) {}
