package com.metabuild.modules.admin.audit.application;
import java.util.List; public record AuditPage<T>(List<T> list,long total){public AuditPage{list=List.copyOf(list);}}
