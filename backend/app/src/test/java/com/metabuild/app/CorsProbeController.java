package com.metabuild.app;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class CorsProbeController {

  @GetMapping("/api/cors-probe")
  Map<String, String> probe() {
    return Map.of("status", "ok");
  }
}
