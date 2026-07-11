package com.metabuild.app.config;

import com.metabuild.infrastructure.jooq.SystemDataScopeExecutor;
import java.util.concurrent.Callable;

/** package-private 后台 consumer 入口，固定路径 context -> authority -> audit -> bypass。 */
final class SystemTaskRunner {
    private final SystemTaskContext context;private final SystemDataScopeExecutor executor;
    SystemTaskRunner(SystemTaskContext context,SystemDataScopeExecutor executor){this.context=context;this.executor=executor;}
    <T>T run(String reason,Callable<T> action){return context.run(()->executor.execute(reason,action));}
}
