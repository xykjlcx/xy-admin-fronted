package com.metabuild.app;

import com.metabuild.app.config.MetaBuilderAuthProperties;
import com.metabuild.app.config.MetaBuilderCorsProperties;
import com.metabuild.modules.admin.AdminModuleMarker;
import com.metabuild.modules.lastmile.LastmileModuleMarker;
import com.metabuild.api.contract.ApiContractMarker;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication(scanBasePackageClasses = {
    MetaBuilderApplication.class,
    AdminModuleMarker.class,
    LastmileModuleMarker.class,
    ApiContractMarker.class
})
@EnableConfigurationProperties({MetaBuilderAuthProperties.class, MetaBuilderCorsProperties.class})
public class MetaBuilderApplication {

  public static void main(String[] args) {
    SpringApplication.run(MetaBuilderApplication.class, args);
  }
}
