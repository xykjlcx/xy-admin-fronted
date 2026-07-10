package com.metabuilder.admin.api;

import java.util.Set;

/**
 * 站内信批量发布结果。
 */
public record PublishResult(Set<String> acceptedKeys, Set<String> rejectedKeys) {

    public PublishResult {
        acceptedKeys = Set.copyOf(acceptedKeys);
        rejectedKeys = Set.copyOf(rejectedKeys);
    }
}
