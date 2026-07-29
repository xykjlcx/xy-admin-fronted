package com.metabuild.modules.admin.messages.application;
import com.fasterxml.jackson.annotation.JsonInclude;import java.util.UUID;
public record MessageView(UUID id,String category,String title,String from,String occurredAt,String body,boolean unread,@JsonInclude(JsonInclude.Include.ALWAYS) String approvalStatus) {}
