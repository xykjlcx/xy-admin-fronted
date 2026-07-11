package com.metabuild.app.config;

import com.metabuild.modules.admin.profile.application.ProfileService;
import org.springframework.scheduling.annotation.Scheduled;

/** 改密码已提交但外部会话撤销未完成时，有界、幂等地前滚。 */
final class CredentialRevocationScheduler {
    private final ProfileService profiles;
    CredentialRevocationScheduler(ProfileService profiles) { this.profiles = profiles; }
    @Scheduled(fixedDelayString = "${metabuilder.credentials.reconcile-delay-ms:5000}")
    void reconcile() { profiles.reconcileCredentialRevocations(100); }
}
