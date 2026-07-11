package com.metabuild.app.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.metabuild.modules.admin.auth.api.AuthorizationRefreshService;
import com.metabuild.modules.admin.auth.application.AuthorizationBatchSnapshotStore;
import com.metabuild.modules.admin.auth.application.AuthorizationReconciler;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class IamRuntimeCompletenessGateTest {
  @Test void everyMissingProtocolBeanFailsContextAndCompleteSetCreatesGate(){
    List<Class<?>> required=List.of(AuthorizationRefreshService.class,AuthorizationBatchSnapshotStore.class,
        AuthorizationReconciler.class,PermissionCatalogSynchronizer.class);
    for(Class<?> missing:required)runner(required.stream().filter(type->type!=missing).toList()).run(context->assertThat(context).hasFailed());
    runner(required).run(context->{assertThat(context).hasNotFailed();assertThat(context).hasSingleBean(IamRuntimeCompletenessGate.class);});
  }
  private static ApplicationContextRunner runner(List<Class<?>> present){var runner=new ApplicationContextRunner().withBean(IamRuntimeCompletenessGate.class);for(Class<?> type:present)runner=withMock(runner,type);return runner;}
  @SuppressWarnings({"unchecked","rawtypes"}) private static ApplicationContextRunner withMock(ApplicationContextRunner runner,Class<?> type){return runner.withBean((Class)type,()->mock(type));}
}
