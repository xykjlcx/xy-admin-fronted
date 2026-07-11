package com.metabuild.modules.admin.profile.application;
import com.fasterxml.jackson.annotation.JsonInclude;
public record LoginDeviceView(String id,String name,String location,String ip,@JsonInclude(JsonInclude.Include.ALWAYS) String lastActive,boolean current){}
