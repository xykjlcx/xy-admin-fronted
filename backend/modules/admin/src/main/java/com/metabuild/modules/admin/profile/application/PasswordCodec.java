package com.metabuild.modules.admin.profile.application;
public interface PasswordCodec {String hash(String raw);boolean matches(String raw,String encoded);}
