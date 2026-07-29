package com.metabuild.modules.admin.auth.application;
import java.util.UUID;
public interface LoginAuditPort {void record(UUID userId,String username,boolean success,String failureCode,String ip,String userAgent);LoginAuditPort NOOP=(userId,username,success,failureCode,ip,userAgent)->{};}
