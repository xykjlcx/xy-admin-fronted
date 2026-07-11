package com.metabuild.modules.admin.task20;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.metabuild.modules.admin.dictionaries.application.*;
import com.metabuild.modules.admin.dictionaries.controller.DictionaryController;
import com.metabuild.shared.kernel.DomainException;
import com.metabuild.shared.kernel.UuidV7Generator;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

class Task20ValidationMockMvcTest {
    @Test void overwidePayloadReturnsProblem400BeforeRepositoryMutation() throws Exception {
        var repository = new CountingRepository();
        var controller = new DictionaryController(new DictionaryService(repository, new UuidV7Generator()));
        var mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new ProblemAdvice()).build();

        mvc.perform(post("/api/dictionaries").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"%s\",\"code\":\"valid\",\"remark\":\"\",\"builtin\":false}".formatted("n".repeat(129))))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"code\":\"request.validation.failed\"")));
        assertThat(repository.inserts).isZero();
    }

    private static final class CountingRepository implements DictionaryRepository {
        int inserts;
        public List<DictionaryView> list(){return List.of();} public Optional<DictionaryView> find(UUID id){return Optional.empty();}
        public DictionaryView insert(DictionaryView value){inserts++;return value;} public DictionaryView update(UUID id,String n,String r){throw new UnsupportedOperationException();}
        public boolean delete(UUID id){return false;} public List<DictionaryItemView> items(UUID id){return List.of();}
        public Optional<DictionaryItemView> findItem(UUID d,UUID i){return Optional.empty();} public DictionaryItemView insertItem(DictionaryItemView value){throw new UnsupportedOperationException();}
        public DictionaryItemView updateItem(DictionaryItemView value){throw new UnsupportedOperationException();} public boolean deleteItem(UUID d,UUID i){return false;}
    }

    @RestControllerAdvice
    static final class ProblemAdvice {
        @ExceptionHandler(DomainException.class)
        ResponseEntity<ProblemDetail> domain(DomainException failure) {
            ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
            problem.setDetail(failure.getMessage());
            problem.setProperty("code", failure.errorCode().code());
            return ResponseEntity.of(problem).build();
        }
    }
}
