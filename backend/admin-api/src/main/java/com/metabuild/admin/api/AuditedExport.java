package com.metabuild.admin.api;
import java.lang.annotation.*;
@Target(ElementType.METHOD) @Retention(RetentionPolicy.RUNTIME) @Documented public @interface AuditedExport {String operation();}
