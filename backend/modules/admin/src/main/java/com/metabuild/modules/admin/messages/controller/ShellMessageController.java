package com.metabuild.modules.admin.messages.controller;
import com.metabuild.admin.api.security.RequiresPermissions;import com.metabuild.modules.admin.auth.api.CurrentAuthorizationProvider;import com.metabuild.modules.admin.messages.application.*;import java.util.UUID;import org.springframework.http.ResponseEntity;import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/messages") public final class ShellMessageController {
 private final CurrentAuthorizationProvider current;private final MessageService service;public ShellMessageController(CurrentAuthorizationProvider current,MessageService service){this.current=current;this.service=service;}
 @GetMapping public MessagePage list(@RequestParam(defaultValue="all")String status){return service.list(user(),status);}
 @PatchMapping("/{id}/read") public MessageView read(@PathVariable UUID id){return service.markRead(user(),id);}
 @PatchMapping("/read-all") public ResponseEntity<Void> readAll(){service.markAllRead(user());return ResponseEntity.noContent().build();}
 @PatchMapping("/{id}/approval") @RequiresPermissions(codes="notice:msg:edit") public MessageView decide(@PathVariable UUID id,@RequestBody ApprovalAction input){return service.decide(user(),id,input.action());}
 @DeleteMapping("/{id}") @RequiresPermissions(codes="notice:msg:del") public ResponseEntity<Void> delete(@PathVariable UUID id){service.delete(user(),id);return ResponseEntity.noContent().build();}
 private UUID user(){return current.current().userId();} public record ApprovalAction(String action){}
}
