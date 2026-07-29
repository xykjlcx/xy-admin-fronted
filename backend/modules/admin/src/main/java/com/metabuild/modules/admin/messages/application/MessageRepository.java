package com.metabuild.modules.admin.messages.application;
import java.util.UUID;
public interface MessageRepository {
  MessagePage list(UUID userId,String status);
  MessageView markRead(UUID userId,UUID id);
  void markAllRead(UUID userId);
  MessageView decide(UUID userId,UUID actorId,UUID id,String decision);
  void delete(UUID userId,UUID id);
}
