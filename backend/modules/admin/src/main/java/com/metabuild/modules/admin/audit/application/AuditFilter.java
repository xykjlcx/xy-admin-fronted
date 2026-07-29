package com.metabuild.modules.admin.audit.application;
import java.time.LocalDate; public record AuditFilter(String keyword,String discriminator,LocalDate startDate,LocalDate endDate,int page,int size){}
