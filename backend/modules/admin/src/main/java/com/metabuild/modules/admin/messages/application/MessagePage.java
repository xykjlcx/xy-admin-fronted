package com.metabuild.modules.admin.messages.application;
import java.util.List;
public record MessagePage(List<MessageView> list,long unreadCount) { public MessagePage { list=List.copyOf(list); } }
