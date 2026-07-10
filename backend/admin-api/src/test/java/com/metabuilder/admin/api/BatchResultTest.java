package com.metabuilder.admin.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class BatchResultTest {

    @Test
    void acceptsEmptyResult() {
        BatchResult<String, String> result = new BatchResult<>(Map.of(), Set.of());

        assertEquals(Map.of(), result.found());
        assertEquals(Set.of(), result.missing());
    }

    @Test
    void representsPartialMissingResult() {
        BatchResult<String, String> result =
                new BatchResult<>(Map.of("found", "value"), Set.of("missing"));

        assertEquals(Map.of("found", "value"), result.found());
        assertEquals(Set.of("missing"), result.missing());
    }

    @Test
    void rejectsKeysThatAreBothFoundAndMissing() {
        assertThrows(
                IllegalArgumentException.class,
                () -> new BatchResult<>(Map.of("same", "value"), Set.of("same")));
    }

    @Test
    void defensivelyCopiesCollections() {
        Map<String, String> found = new HashMap<>(Map.of("found", "value"));
        Set<String> missing = new HashSet<>(Set.of("missing"));

        BatchResult<String, String> result = new BatchResult<>(found, missing);
        found.put("later", "value");
        missing.add("later");

        assertEquals(Map.of("found", "value"), result.found());
        assertEquals(Set.of("missing"), result.missing());
        assertThrows(UnsupportedOperationException.class, () -> result.found().put("x", "y"));
        assertThrows(UnsupportedOperationException.class, () -> result.missing().add("x"));
    }
}
