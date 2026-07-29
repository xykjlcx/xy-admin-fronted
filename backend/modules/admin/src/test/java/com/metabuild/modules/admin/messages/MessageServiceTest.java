package com.metabuild.modules.admin.messages;

import static org.assertj.core.api.Assertions.*;
import com.metabuild.modules.admin.messages.application.*;
import com.metabuild.shared.kernel.Conflict;
import java.time.OffsetDateTime;
import java.util.*;
import org.junit.jupiter.api.Test;

class MessageServiceTest {
  @Test void onlyPendingApprovalCanBeDecided() {
    var repository = new MemoryRepository();
    UUID user = UUID.fromString("01900000-0000-7000-8000-000000000010");
    UUID message = UUID.fromString("01900000-0000-7000-8000-000000000801");
    repository.value = new MessageView(message,"approval","Review","System",OffsetDateTime.now().toString(),"Body",true,"pending");
    var service = new MessageService(repository);
    assertThat(service.decide(user,message,"approve").approvalStatus()).isEqualTo("approved");
    assertThatThrownBy(() -> service.decide(user,message,"reject"))
        .isInstanceOf(Conflict.class).hasMessageContaining("processed");
  }

  private static final class MemoryRepository implements MessageRepository {
    private MessageView value;
    public MessagePage list(UUID user,String status){return new MessagePage(List.of(value),value.unread()?1:0);}
    public MessageView markRead(UUID user,UUID id){value=copy(false,value.approvalStatus());return value;}
    public void markAllRead(UUID user){value=copy(false,value.approvalStatus());}
    public MessageView decide(UUID user,UUID actor,UUID id,String decision){
      if(!"pending".equals(value.approvalStatus())) throw new Conflict(()->"message.approval.already-processed","Approval already processed");
      value=copy(false,decision.equals("approve")?"approved":"rejected");return value;
    }
    public void delete(UUID user,UUID id){}
    private MessageView copy(boolean unread,String status){return new MessageView(value.id(),value.category(),value.title(),value.from(),value.occurredAt(),value.body(),unread,status);}
  }
}
