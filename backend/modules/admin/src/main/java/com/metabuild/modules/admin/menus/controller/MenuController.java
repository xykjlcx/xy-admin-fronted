package com.metabuild.modules.admin.menus.controller;

import com.metabuild.modules.admin.menus.application.MenuItem;
import com.metabuild.modules.admin.menus.api.NavigationQuery;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.*;
import com.metabuild.admin.api.security.RequiresPermissions;
import com.metabuild.modules.admin.menus.application.MenuRepository;
import com.metabuild.modules.admin.menus.application.MenuRow;
import com.metabuild.shared.kernel.UuidV7Generator;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/menus")
public final class MenuController {
    private final NavigationQuery menus;
    private final MenuRepository repository;private final UuidV7Generator ids;
    public MenuController(NavigationQuery menus,MenuRepository repository,UuidV7Generator ids) { this.menus=menus;this.repository=repository;this.ids=ids; }
    @GetMapping @RequiresPermissions(codes={"iam:menu:view"}) public List<MenuItem> list(@RequestParam String subsystem) { return menus.load(subsystem); }
    @PostMapping @RequiresPermissions(codes={"iam:menu:create"}) public MenuItem create(@RequestBody Write body){body.validateRuntime();return item(repository.createRuntimeDirectory(ids.generate(),body.subsystemKey(),body.parentId(),body.label(),body.icon(),body.sort(),body.visible()),body.label());}
    @PutMapping("/{id}") @RequiresPermissions(codes={"iam:menu:update"}) public MenuItem update(@PathVariable UUID id,@RequestBody Write body){body.validateDisplayOnly();return item(repository.customize(id,body.parentId(),true,body.label(),body.icon(),body.sort(),body.visible()),body.label());}
    @PatchMapping("/{id}/visibility") @RequiresPermissions(codes={"iam:menu:toggle"}) public MenuItem visibility(@PathVariable UUID id,@RequestBody Visibility body){return item(repository.setVisibility(id,body.visible()),null);}
    @DeleteMapping("/{id}") @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT) @RequiresPermissions(codes={"iam:menu:del"}) public void delete(@PathVariable UUID id){repository.deleteRuntime(id);}
    private static MenuItem item(MenuRow row,Map<String,String> labels){Map<String,String> effective=labels==null||labels.isEmpty()?(row.localizedLabel()==null?Map.of("zh-CN",row.labelKey(),"en-US",row.labelKey()):row.localizedLabel()):Map.copyOf(labels);return new MenuItem(row.id(),row.parentId(),row.subsystemKey(),row.type(),effective,row.icon(),row.path(),row.permission(),row.visible(),row.sort());}
    public record Visibility(boolean visible){}
    public record Write(String subsystemKey,String type,UUID parentId,Map<String,String> label,String icon,int sort,boolean visible,String path,String permission){
      void validateRuntime(){if(!"dir".equals(type)||parentId!=null||path!=null||permission!=null||subsystemKey==null||!validLabel())throw invalid();}
      void validateDisplayOnly(){if(!("dir".equals(type)||"menu".equals(type)||"action".equals(type))||!validLabel())throw invalid();}
      String labelValue(){if(label==null)return "";return label.getOrDefault("zh-CN",label.getOrDefault("en-US",label.values().stream().findFirst().orElse("")));}
      boolean validLabel(){return label!=null&&!label.isEmpty()&&label.entrySet().stream().allMatch(e->e.getKey()!=null&&!e.getKey().isBlank()&&e.getValue()!=null&&!e.getValue().isBlank());}
      private static com.metabuild.shared.kernel.BadRequest invalid(){return new com.metabuild.shared.kernel.BadRequest(()->"iam.menu.catalog-owned","Only display fields of catalog menus and runtime directories are writable");}
    }
}
