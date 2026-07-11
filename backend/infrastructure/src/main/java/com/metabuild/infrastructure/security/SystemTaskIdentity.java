package com.metabuild.infrastructure.security;

import java.util.UUID;

/** 封闭系统任务身份；业务模块不能实现或构造。 */
public sealed interface SystemTaskIdentity permits VerifiedSystemTaskIdentity {
    UUID actorId();
}

record VerifiedSystemTaskIdentity(UUID actorId) implements SystemTaskIdentity { }
