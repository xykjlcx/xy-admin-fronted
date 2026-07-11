package com.metabuild.app.config;

import com.metabuild.modules.admin.auth.api.AuthorizationRefreshService;
import com.metabuild.modules.admin.auth.application.AuthorizationBatchSnapshotStore;
import com.metabuild.modules.admin.auth.application.AuthorizationReconciler;

/** IAM 写入口的启动期完备性门禁；构造成功即证明关键协议 bean 全部存在且唯一。 */
public record IamRuntimeCompletenessGate(AuthorizationRefreshService refresh,
    AuthorizationBatchSnapshotStore fence, AuthorizationReconciler reconciler,
    PermissionCatalogSynchronizer synchronizer) {}
