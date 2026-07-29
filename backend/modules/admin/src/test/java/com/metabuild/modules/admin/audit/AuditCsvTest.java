package com.metabuild.modules.admin.audit;

import static org.assertj.core.api.Assertions.assertThat;
import com.metabuild.modules.admin.audit.application.*;
import java.util.List;
import org.junit.jupiter.api.Test;

class AuditCsvTest {
  @Test void escapesFormulaAndQuotesAndCarriesUtf8Bom() {
    byte[] csv=AuditCsv.operation(List.of(new OperationLogView("id","2026-07-12T00:00:00Z","=cmd", "edit","iam","A\"B","127.0.0.1")));
    String text=new String(csv,java.nio.charset.StandardCharsets.UTF_8);
    assertThat(text).startsWith("\ufeff").contains("'=cmd").contains("A\"\"B");
  }
}
