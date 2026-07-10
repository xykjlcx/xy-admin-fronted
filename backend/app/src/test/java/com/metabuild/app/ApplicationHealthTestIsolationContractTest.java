package com.metabuild.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import java.lang.reflect.Field;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

class ApplicationHealthTestIsolationContractTest {

  @Test
  void destructiveDependencyHealthChecksUseIndependentContainersWithoutMethodOrdering()
      throws Exception {
    Class<?> stableHealthClass = ApplicationHealthIntegrationTest.class;
    assertThatCode(
        () -> Class.forName("com.metabuild.app.ApplicationDependencyHealthIntegrationTest"))
        .doesNotThrowAnyException();
    Class<?> destructiveHealthClass =
        Class.forName("com.metabuild.app.ApplicationDependencyHealthIntegrationTest");

    assertThat(stableHealthClass.getAnnotation(TestMethodOrder.class)).isNull();
    assertThat(Arrays.stream(stableHealthClass.getDeclaredMethods()).map(method -> method.getName()))
        .doesNotContain("keepsLivenessUpWhenRuntimeDependenciesGoDown");
    assertThat(Arrays.stream(destructiveHealthClass.getDeclaredMethods())
        .map(method -> method.getName()))
        .contains("keepsLivenessUpWhenRuntimeDependenciesGoDown");

    assertThat(staticField(stableHealthClass, "POSTGRES"))
        .isNotSameAs(staticField(destructiveHealthClass, "POSTGRES"));
    assertThat(staticField(stableHealthClass, "REDIS"))
        .isNotSameAs(staticField(destructiveHealthClass, "REDIS"));
  }

  private Object staticField(Class<?> owner, String name) throws Exception {
    Field field = owner.getDeclaredField(name);
    field.setAccessible(true);
    return field.get(null);
  }
}
