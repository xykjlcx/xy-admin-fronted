package com.metabuilder.shared.kernel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class PageResultTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void serializesWithExactlyListAndTotalFields() throws JsonProcessingException {
        PageResult<String> result = new PageResult<>(List.of("first"), 1);

        assertEquals(
                objectMapper.readTree("{\"list\":[\"first\"],\"total\":1}"),
                objectMapper.readTree(objectMapper.writeValueAsString(result)));
    }

    @Test
    void defensivelyCopiesList() {
        List<String> source = new ArrayList<>(List.of("first"));

        PageResult<String> result = new PageResult<>(source, 1);
        source.add("second");

        assertEquals(List.of("first"), result.list());
        assertThrows(UnsupportedOperationException.class, () -> result.list().add("third"));
    }

    @Test
    void rejectsNegativeTotal() {
        assertThrows(IllegalArgumentException.class, () -> new PageResult<>(List.of(), -1));
    }
}
