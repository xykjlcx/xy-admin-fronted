package com.metabuild.infrastructure.security;

import com.metabuild.infrastructure.jooq.SystemPrincipalAuthority;
import java.util.Objects;
import java.util.UUID;
import java.util.function.BooleanSupplier;

/** 仅当 app 内部 system-task context 激活时签发 sealed identity。 */
public final class InternalSystemTaskAuthority implements SystemPrincipalAuthority {
    private final BooleanSupplier active;
    private final UUID actorId;
    public InternalSystemTaskAuthority(BooleanSupplier active, UUID actorId) {
        this.active=Objects.requireNonNull(active,"active");this.actorId=Objects.requireNonNull(actorId,"actorId");
    }
    @Override public SystemTaskIdentity requireSystemPrincipal(){
        if(!active.getAsBoolean())throw new SecurityException("System task context is not active");
        return new VerifiedSystemTaskIdentity(actorId);
    }
}
