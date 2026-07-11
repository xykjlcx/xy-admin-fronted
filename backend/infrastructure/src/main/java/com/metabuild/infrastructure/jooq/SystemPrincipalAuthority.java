package com.metabuild.infrastructure.jooq;

/** 安全门面实现此端口；普通认证用户必须拒绝。 */
@FunctionalInterface
public interface SystemPrincipalAuthority {
    com.metabuild.infrastructure.security.SystemTaskIdentity requireSystemPrincipal();
}
