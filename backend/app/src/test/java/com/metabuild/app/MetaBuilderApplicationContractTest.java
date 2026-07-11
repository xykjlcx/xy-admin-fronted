package com.metabuild.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import com.metabuild.modules.admin.AdminModuleMarker;
import com.metabuild.modules.lastmile.LastmileModuleMarker;
import com.metabuild.api.contract.ApiContractMarker;
import java.lang.reflect.Method;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.SpringBootApplication;

class MetaBuilderApplicationContractTest {

  @Test
  void exposesTheCanonicalSpringBootEntryPoint() throws Exception {
    AtomicReference<Class<?>> applicationClassReference = new AtomicReference<>();
    assertThatCode(() -> applicationClassReference.set(
            Class.forName("com.metabuild.app.MetaBuilderApplication")))
        .doesNotThrowAnyException();
    Class<?> applicationClass = applicationClassReference.get();

    assertThat(applicationClass).hasAnnotation(SpringBootApplication.class);
    SpringBootApplication annotation = applicationClass.getAnnotation(SpringBootApplication.class);
    assertThat(annotation.scanBasePackages()).isEmpty();
    assertThat(annotation.scanBasePackageClasses())
        .containsExactlyInAnyOrder(
            MetaBuilderApplication.class,
            AdminModuleMarker.class,
            LastmileModuleMarker.class,
            ApiContractMarker.class);
    Method main = applicationClass.getDeclaredMethod("main", String[].class);
    assertThat(main.getReturnType()).isEqualTo(void.class);
  }
}
