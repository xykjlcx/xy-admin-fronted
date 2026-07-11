package com.metabuild.app.config;

import com.metabuild.modules.admin.auth.application.AuthorizationReconciler;
import java.time.Duration;
import org.springframework.scheduling.annotation.Scheduled;

/** 每轮均由 reconciler 的固定 limit 限界，不扫描会话或设备。 */
public final class AuthorizationReconciliationScheduler {
    private final AuthorizationReconciler reconciler;
    public AuthorizationReconciliationScheduler(AuthorizationReconciler reconciler){this.reconciler=reconciler;}
    @Scheduled(fixedDelayString="${metabuilder.auth.reconciliation-delay:PT5S}")
    public void reconcile(){reconciler.reconcile();reconciler.reconcileAbandoned(Duration.ofMinutes(1));}
}
