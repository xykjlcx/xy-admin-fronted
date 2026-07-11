package com.metabuild.modules.admin.dictionaries.application;
import java.util.*;
public interface DictionaryRepository {
 List<DictionaryView> list(); Optional<DictionaryView> find(UUID id); DictionaryView insert(DictionaryView value); DictionaryView update(UUID id,String name,String remark); boolean delete(UUID id);
 List<DictionaryItemView> items(UUID dictionaryId); Optional<DictionaryItemView> findItem(UUID dictionaryId,UUID id); DictionaryItemView insertItem(DictionaryItemView value); DictionaryItemView updateItem(DictionaryItemView value); boolean deleteItem(UUID dictionaryId,UUID id);
}
