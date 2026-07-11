package com.metabuild.app.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import java.util.List;

class PermissionCatalogSynchronizerTest {
  @Test
  void classpathCatalogCarriesVersionAndStableSources() throws Exception {
    var catalog = PermissionCatalogSynchronizer.readCatalog(
        new ObjectMapper(), "permissions/permission-catalog.json", "permissions/menu-seed.json");

    assertThat(catalog.version()).isPositive();
    assertThat(catalog.digest()).matches("[0-9a-f]{64}");
    assertThat(catalog.permissions()).isNotEmpty().allSatisfy(item -> {
      assertThat(item.sourceKey()).isNotBlank();
      assertThat(item.code()).matches("[^:]+:[^:]+:[^:]+");
    });
    assertThat(catalog.menus()).isNotEmpty();
  }
  @Test void rejectsSelfTwoNodeAndDeepCatalogMenuCyclesBeforeDatabaseWrites(){for(List<String[]> edges:List.<List<String[]>>of(java.util.Collections.singletonList(new String[]{"a","a"}),java.util.Arrays.asList(new String[]{"a","b"},new String[]{"b","a"}),java.util.Arrays.asList(new String[]{"a","b"},new String[]{"b","c"},new String[]{"c","a"}))){var menus=edges.stream().map(edge->new PermissionCatalogSynchronizer.Menu(edge[0],"admin",null,null,"dir",null,edge[1],edge[0],null,1,true)).toList();assertThatThrownBy(()->PermissionCatalogSynchronizer.validateMenuDag(menus)).isInstanceOf(IllegalStateException.class).hasMessageContaining("cycle");}}
}
