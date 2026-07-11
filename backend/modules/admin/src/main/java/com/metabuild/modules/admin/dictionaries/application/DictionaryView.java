package com.metabuild.modules.admin.dictionaries.application;
import java.util.UUID;
public record DictionaryView(UUID id,String name,String code,String remark,boolean builtin) {}
