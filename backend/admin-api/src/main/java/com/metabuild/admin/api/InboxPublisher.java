package com.metabuild.admin.api;

import java.util.Collection;

/**
 * 站内信发布端口。
 */
public interface InboxPublisher {

    PublishResult publish(Collection<InboxMessageCommand> messages);
}
