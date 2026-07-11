package com.metabuild.modules.admin.company.application;
import java.util.UUID;
public interface CompanyRepository {CompanyView get();CompanyView update(UUID actorId,CompanyUpdate value);}
