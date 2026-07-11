package com.metabuild.infrastructure.web;

import com.metabuild.shared.kernel.UuidV7;
import java.beans.PropertyEditorSupport;
import java.util.UUID;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.InitBinder;

/**
 * 将 path/query/form 中的 UUID 参数收紧为 canonical UUIDv7。
 */
@ControllerAdvice
public final class UuidV7WebBindingAdvice {

    @InitBinder
    void registerUuidV7Editor(WebDataBinder binder) {
        binder.registerCustomEditor(UUID.class, new PropertyEditorSupport() {
            @Override
            public void setAsText(String text) {
                setValue(UuidV7.parse(text));
            }
        });
    }
}
