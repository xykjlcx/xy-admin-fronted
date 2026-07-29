package com.metabuild.modules.admin.messages.application;
import java.util.concurrent.atomic.AtomicBoolean;
public final class InboxOutboxSignal {private final AtomicBoolean pending=new AtomicBoolean();public void wake(){pending.set(true);}public boolean consume(){return pending.getAndSet(false);}}
