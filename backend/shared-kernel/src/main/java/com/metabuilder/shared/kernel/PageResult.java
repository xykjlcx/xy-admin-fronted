package com.metabuilder.shared.kernel;

import java.util.List;

/**
 * 统一分页结果。
 */
public record PageResult<T>(List<T> list, long total) {

    public PageResult {
        list = List.copyOf(list);
        if (total < 0) {
            throw new IllegalArgumentException("total must not be negative");
        }
    }
}
