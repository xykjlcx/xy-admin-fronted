package com.metabuild.modules.admin.auth.api;

import java.util.Set;
import java.util.UUID;

/**
 * 授权图写命令执行器。Task16 实现必须在同一事务内完成：AUTHZ_GRAPH 锁、preimage、
 * fence、mutation、revision/outbox；提交后再刷新快照。application 不得绕过此端口写授权图。
 */
public interface AuthorizationRefreshService {
    enum Cause { USER_CHANGED, DEPARTMENT_CHANGED, ROLE_CHANGED, GRANT_CHANGED, DATA_SCOPE_CHANGED }

    <T> T execute(Cause cause, AuthorizationChange<T> change);

    /** Catalog 命令必须在同一真实事务中先取得 CATALOG_SEED，再取得 AUTHZ_GRAPH。 */
    default <T> T executeCatalog(Cause cause, AuthorizationChange<T> change) {
        throw new UnsupportedOperationException("Catalog protocol is not configured");
    }

    <T> T executeTerminal(TerminalChange<T> change);
    default <T> T executeEnable(AuthorizationChange<T> change){return execute(Cause.USER_CHANGED,change);}

    interface AuthorizationChange<T> {
        /** 取得全局锁后、mutation 前固化目标用户。 */
        Set<UUID> affectedUserIds();
        T mutate();
    }

    interface TerminalChange<T> extends AuthorizationChange<T> {
        TerminalAction terminalAction();
    }

    enum TerminalAction { DISABLE_ACCOUNT, DELETE_ACCOUNT }
}
