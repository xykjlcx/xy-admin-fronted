package com.metabuild.admin.api;

import java.time.Duration;
import java.util.Set;

/**
 * 上传能力票据的校验策略。
 */
public record UploadPolicy(
        Set<String> extensions, Set<String> mimeTypes, long maxBytes, Duration ttl) {

    public UploadPolicy {
        extensions = Set.copyOf(extensions);
        mimeTypes = Set.copyOf(mimeTypes);
    }
}
