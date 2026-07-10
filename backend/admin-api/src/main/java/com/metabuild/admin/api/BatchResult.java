package com.metabuild.admin.api;

import java.util.Collections;
import java.util.Map;
import java.util.Set;

/**
 * 批量查询结果，允许部分命中。
 */
public record BatchResult<K, V>(Map<K, V> found, Set<K> missing) {

    public BatchResult {
        found = Map.copyOf(found);
        missing = Set.copyOf(missing);
        if (!Collections.disjoint(found.keySet(), missing)) {
            throw new IllegalArgumentException("found and missing keys must not overlap");
        }
    }
}
