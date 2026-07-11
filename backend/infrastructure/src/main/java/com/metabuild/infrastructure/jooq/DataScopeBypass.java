package com.metabuild.infrastructure.jooq;

/** 仅供同包内 SystemDataScopeExecutor 使用的原语，业务代码无法直接开启。 */
final class DataScopeBypass {
    private static final ThreadLocal<Boolean> ACTIVE = ThreadLocal.withInitial(() -> false);
    private DataScopeBypass() { }

    static boolean active() { return ACTIVE.get(); }

    static <T> T run(java.util.concurrent.Callable<T> action) throws Exception {
        if (ACTIVE.get()) throw new IllegalStateException("Nested data-scope bypass is forbidden");
        ACTIVE.set(true);
        try { return action.call(); } finally { ACTIVE.remove(); }
    }
}
