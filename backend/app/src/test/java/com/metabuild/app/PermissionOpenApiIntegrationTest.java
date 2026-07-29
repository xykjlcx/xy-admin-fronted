package com.metabuild.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.metabuild.api.contract.permissions.PermissionCatalogLoader;
import com.metabuild.api.contract.permissions.PermissionContractVerifier;
import com.metabuild.api.contract.permissions.PermissionOperationCustomizer;
import com.metabuild.modules.admin.auth.api.CurrentAuthorizationProvider;
import com.metabuild.modules.admin.dashboard.controller.DashboardController;
import com.metabuild.modules.admin.dashboard.application.DashboardRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springdoc.core.configuration.SpringDocConfiguration;
import org.springdoc.core.configuration.SpringDocSpecPropertiesConfiguration;
import org.springdoc.core.properties.SpringDocConfigProperties;
import org.springdoc.webmvc.core.configuration.SpringDocWebMvcConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(value = DashboardController.class, properties = {
        "metabuilder.auth.token-secret=0123456789abcdef0123456789abcdef",
        "metabuilder.auth.deployment-mode=test"
})
@Import(PermissionOperationCustomizer.class)
@ImportAutoConfiguration({SpringDocConfigProperties.class, SpringDocConfiguration.class,
        SpringDocSpecPropertiesConfiguration.class, SpringDocWebMvcConfiguration.class})
class PermissionOpenApiIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @MockitoBean CurrentAuthorizationProvider authorization;
    @MockitoBean DashboardRepository dashboardRepository;

    @Test
    void actualSpringdocEndpointExportsAndReconcilesAllConsumedPermissions() throws Exception {
        String json = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        var openApi = mapper.readTree(json);
        var consumed = PermissionContractVerifier.consumedCodes(openApi);
        assertThat(openApi.at("/paths/~1api~1dashboard~1overview/get/x-permissions/logic").asText()).isEqualTo("AND");
        assertThat(consumed).contains("dashboard:overview:view");

        var loader = new PermissionCatalogLoader(mapper);
        var catalog = loader.load("permissions/permission-catalog.json");
        var menu = loader.loadMenu("permissions/menu-seed.json");
        PermissionContractVerifier.verify(catalog, menu, consumed);
    }
}
