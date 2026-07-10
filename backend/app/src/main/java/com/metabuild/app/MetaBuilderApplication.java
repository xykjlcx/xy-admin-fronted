package com.metabuild.app;

import com.metabuild.app.config.MetaBuilderAuthProperties;
import com.metabuild.app.config.MetaBuilderCorsProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication(scanBasePackages = "com.metabuild")
@EnableConfigurationProperties({MetaBuilderAuthProperties.class, MetaBuilderCorsProperties.class})
public class MetaBuilderApplication {

  public static void main(String[] args) {
    SpringApplication.run(MetaBuilderApplication.class, args);
  }
}
