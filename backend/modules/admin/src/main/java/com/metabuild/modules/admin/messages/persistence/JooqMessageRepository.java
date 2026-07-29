package com.metabuild.modules.admin.messages.persistence;

import static com.metabuild.schema.platform.tables.MbInboxMessage.MB_INBOX_MESSAGE;
import com.metabuild.modules.admin.messages.application.*;
import com.metabuild.schema.platform.tables.records.MbInboxMessageRecord;
import com.metabuild.shared.kernel.*;
import java.time.OffsetDateTime;
import java.util.*;
import org.jooq.*;

public final class JooqMessageRepository implements MessageRepository {
  private final DSLContext db; public JooqMessageRepository(DSLContext db){this.db=db;}
  private static MessageView row(MbInboxMessageRecord r){return new MessageView(r.getId(),r.getCategory(),r.getTitle(),r.getSender(),r.getCreatedAt().toString(),r.getBody(),Boolean.TRUE.equals(r.getUnread()),r.getApprovalStatus());}
  public MessagePage list(UUID user,String status){Condition c=MB_INBOX_MESSAGE.RECIPIENT_USER_ID.eq(user);if(status.equals("unread"))c=c.and(MB_INBOX_MESSAGE.UNREAD.isTrue());if(status.equals("read"))c=c.and(MB_INBOX_MESSAGE.UNREAD.isFalse());var list=db.selectFrom(MB_INBOX_MESSAGE).where(c).orderBy(MB_INBOX_MESSAGE.CREATED_AT.desc()).fetch(JooqMessageRepository::row);long unread=db.fetchCount(MB_INBOX_MESSAGE,MB_INBOX_MESSAGE.RECIPIENT_USER_ID.eq(user).and(MB_INBOX_MESSAGE.UNREAD.isTrue()));return new MessagePage(list,unread);}
  public MessageView markRead(UUID user,UUID id){return db.update(MB_INBOX_MESSAGE).set(MB_INBOX_MESSAGE.UNREAD,false).set(MB_INBOX_MESSAGE.UPDATED_AT,OffsetDateTime.now()).where(MB_INBOX_MESSAGE.ID.eq(id).and(MB_INBOX_MESSAGE.RECIPIENT_USER_ID.eq(user))).returning().fetchOptional().map(JooqMessageRepository::row).orElseThrow(JooqMessageRepository::missing);}
  public void markAllRead(UUID user){db.update(MB_INBOX_MESSAGE).set(MB_INBOX_MESSAGE.UNREAD,false).set(MB_INBOX_MESSAGE.UPDATED_AT,OffsetDateTime.now()).where(MB_INBOX_MESSAGE.RECIPIENT_USER_ID.eq(user).and(MB_INBOX_MESSAGE.UNREAD.isTrue())).execute();}
  public MessageView decide(UUID user,UUID actor,UUID id,String action){String target=action.equals("approve")?"approved":"rejected";var updated=db.update(MB_INBOX_MESSAGE).set(MB_INBOX_MESSAGE.APPROVAL_STATUS,target).set(MB_INBOX_MESSAGE.UNREAD,false).set(MB_INBOX_MESSAGE.DECIDED_AT,OffsetDateTime.now()).set(MB_INBOX_MESSAGE.DECIDED_BY,actor).set(MB_INBOX_MESSAGE.UPDATED_AT,OffsetDateTime.now()).where(MB_INBOX_MESSAGE.ID.eq(id).and(MB_INBOX_MESSAGE.RECIPIENT_USER_ID.eq(user)).and(MB_INBOX_MESSAGE.CATEGORY.eq("approval")).and(MB_INBOX_MESSAGE.APPROVAL_STATUS.eq("pending"))).returning().fetchOptional();if(updated.isPresent())return row(updated.get());if(!db.fetchExists(MB_INBOX_MESSAGE,MB_INBOX_MESSAGE.ID.eq(id).and(MB_INBOX_MESSAGE.RECIPIENT_USER_ID.eq(user))))throw missing();throw new Conflict(()->"message.approval.already-processed","Approval already processed");}
  public void delete(UUID user,UUID id){if(db.deleteFrom(MB_INBOX_MESSAGE).where(MB_INBOX_MESSAGE.ID.eq(id).and(MB_INBOX_MESSAGE.RECIPIENT_USER_ID.eq(user))).execute()==0)throw missing();}
  private static NotFound missing(){return new NotFound(()->"message.not-found","Message not found");}
}
