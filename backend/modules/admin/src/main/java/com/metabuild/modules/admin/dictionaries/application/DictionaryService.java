package com.metabuild.modules.admin.dictionaries.application;
import com.metabuild.shared.kernel.*; import java.util.*;
public final class DictionaryService {
 private static final Set<String> COLORS=Set.of("primary","success","warning","danger","neutral"); private final DictionaryRepository repository; private final UuidV7Generator ids;
 public DictionaryService(DictionaryRepository repository,UuidV7Generator ids){this.repository=repository;this.ids=ids;}
 public List<DictionaryView> list(){return repository.list();}
 public DictionaryView create(String name,String code,String remark,boolean builtin){required(name,"name",128);if(code==null||code.trim().length()>128||!code.trim().matches("^[a-z][a-z0-9_]*$"))throw invalid("Dictionary code is invalid");bounded(remark,512,"remark");return repository.insert(new DictionaryView(ids.generate(),name.trim(),code.trim(),text(remark),builtin));}
 public DictionaryView update(UUID id,String name,String remark){required(name,"name",128);bounded(remark,512,"remark");require(id);return repository.update(id,name.trim(),text(remark));}
 public void delete(UUID id){var dictionary=require(id);if(dictionary.builtin())throw new Conflict(()->"dictionary.builtin.protected","Built-in dictionary cannot be deleted");repository.delete(id);}
 public List<DictionaryItemView> items(UUID id){require(id);return repository.items(id);}
 public DictionaryItemView createItem(UUID dictionaryId,String label,String value,int sort,boolean enabled,String color,String remark){require(dictionaryId);validateItem(label,value,color,remark);return repository.insertItem(new DictionaryItemView(ids.generate(),dictionaryId,label.trim(),value.trim(),sort,enabled,color,text(remark)));}
 public DictionaryItemView updateItem(UUID dictionaryId,UUID itemId,String label,String value,int sort,boolean enabled,String color,String remark){validateItem(label,value,color,remark);var old=item(dictionaryId,itemId);return repository.updateItem(new DictionaryItemView(old.id(),dictionaryId,label.trim(),value.trim(),sort,enabled,color,text(remark)));}
 public DictionaryItemView setItemEnabled(UUID dictionaryId,UUID itemId,boolean enabled){var old=item(dictionaryId,itemId);return repository.updateItem(new DictionaryItemView(old.id(),old.dictionaryId(),old.label(),old.value(),old.sort(),enabled,old.color(),old.remark()));}
 public void deleteItem(UUID dictionaryId,UUID itemId){if(!repository.deleteItem(dictionaryId,itemId))throw itemMissing();}
 private DictionaryView require(UUID id){return repository.find(id).orElseThrow(()->new NotFound(()->"dictionary.not-found","Dictionary not found"));}
 private DictionaryItemView item(UUID d,UUID i){return repository.findItem(d,i).orElseThrow(DictionaryService::itemMissing);}
 private static NotFound itemMissing(){return new NotFound(()->"dictionary.item.not-found","Dictionary item not found");}
 private static void validateItem(String l,String v,String c,String remark){required(l,"label",128);required(v,"value",128);bounded(remark,512,"remark");if(!COLORS.contains(c))throw invalid("Dictionary item color is invalid");}
 private static void required(String x,String field,int max){if(x==null||x.isBlank()||x.trim().length()>max)throw invalid("Dictionary "+field+" is invalid");} private static void bounded(String x,int max,String field){if(x!=null&&x.trim().length()>max)throw invalid("Dictionary "+field+" is invalid");} private static String text(String x){return x==null?"":x.trim();} private static BadRequest invalid(String m){return new BadRequest(()->"request.validation.failed",m);}
}
