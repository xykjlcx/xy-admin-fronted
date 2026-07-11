package com.metabuild.infrastructure.jooq;

import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import java.util.Objects;

/** 当前执行线程的数据权限上下文。 */
public sealed interface DataScopeAccess {
    record Ready(AuthorizationSnapshot snapshot) implements DataScopeAccess {
        public Ready { Objects.requireNonNull(snapshot, "snapshot"); }
    }
    enum Marker implements DataScopeAccess { UNAUTHENTICATED, INVALID }
}
