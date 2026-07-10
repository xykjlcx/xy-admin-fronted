package com.metabuilder.admin.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Duration;
import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ImmutableValueContractsTest {

    @Test
    void uploadPolicyDefensivelyCopiesSets() {
        Set<String> extensions = new HashSet<>(Set.of("pdf"));
        Set<String> mimeTypes = new HashSet<>(Set.of("application/pdf"));

        UploadPolicy policy =
                new UploadPolicy(extensions, mimeTypes, 1024, Duration.ofMinutes(5));
        extensions.add("exe");
        mimeTypes.add("application/octet-stream");

        assertEquals(Set.of("pdf"), policy.extensions());
        assertEquals(Set.of("application/pdf"), policy.mimeTypes());
        assertThrows(UnsupportedOperationException.class, () -> policy.extensions().add("zip"));
        assertThrows(UnsupportedOperationException.class, () -> policy.mimeTypes().add("text/plain"));
    }

    @Test
    void publishResultDefensivelyCopiesSets() {
        Set<String> accepted = new HashSet<>(Set.of("accepted"));
        Set<String> rejected = new HashSet<>(Set.of("rejected"));

        PublishResult result = new PublishResult(accepted, rejected);
        accepted.add("later");
        rejected.add("later");

        assertEquals(Set.of("accepted"), result.acceptedKeys());
        assertEquals(Set.of("rejected"), result.rejectedKeys());
        assertThrows(UnsupportedOperationException.class, () -> result.acceptedKeys().add("x"));
        assertThrows(UnsupportedOperationException.class, () -> result.rejectedKeys().add("x"));
    }
}
