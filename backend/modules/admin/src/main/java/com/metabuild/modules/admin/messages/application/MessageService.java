package com.metabuild.modules.admin.messages.application;
import com.metabuild.shared.kernel.BadRequest;
import java.util.UUID;
public final class MessageService {
  private final MessageRepository repository;
  public MessageService(MessageRepository repository){this.repository=repository;}
  public MessagePage list(UUID user,String status){if(!java.util.Set.of("all","unread","read").contains(status))throw new BadRequest(()->"message.status.invalid","Invalid message status");return repository.list(user,status);}
  public MessageView markRead(UUID user,UUID id){return repository.markRead(user,id);}
  public void markAllRead(UUID user){repository.markAllRead(user);}
  public MessageView decide(UUID user,UUID id,String action){if(!java.util.Set.of("approve","reject").contains(action))throw new BadRequest(()->"message.approval.action-invalid","Invalid approval action");return repository.decide(user,user,id,action);}
  public void delete(UUID user,UUID id){repository.delete(user,id);}
}
