package com.metabuild.modules.admin.audit.application;
public record LoginLogView(String id,String occurredAt,String user,String result,String ip,String location,String device) {}
