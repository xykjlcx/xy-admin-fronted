package com.metabuild.modules.admin.auth.application;

import com.metabuild.shared.kernel.security.AuthorizationFence;
import java.time.Instant;
import java.util.List;

/** 只读取有界的过期 Fence 候选，禁止 KEYS 或无界 SCAN。 */
public interface AuthorizationFenceIndex {
    List<AuthorizationFence> fencedCandidates(Instant before, int limit);
}
