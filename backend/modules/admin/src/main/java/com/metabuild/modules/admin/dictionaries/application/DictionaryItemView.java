package com.metabuild.modules.admin.dictionaries.application;
import java.util.UUID;
public record DictionaryItemView(UUID id,UUID dictionaryId,String label,String value,int sort,boolean enabled,String color,String remark) {}
