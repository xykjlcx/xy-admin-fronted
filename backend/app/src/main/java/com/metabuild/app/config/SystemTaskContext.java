package com.metabuild.app.config;

import java.util.concurrent.Callable;

/** package-private：业务模块无法获取或激活 system identity。 */
final class SystemTaskContext {
    private final ThreadLocal<Boolean> active=ThreadLocal.withInitial(()->false);
    boolean active(){return active.get();}
    <T>T run(Callable<T> action){
        if(active.get())throw new IllegalStateException("Nested system task context is forbidden");
        active.set(true);try{return action.call();}
        catch(RuntimeException failure){throw failure;}catch(Exception failure){throw new IllegalStateException(failure);}
        finally{active.remove();}
    }
}
