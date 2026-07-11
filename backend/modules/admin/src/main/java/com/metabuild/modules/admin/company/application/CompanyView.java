package com.metabuild.modules.admin.company.application;
import java.util.UUID;
public record CompanyView(UUID id,String name,boolean verified,String domain,String code,String industry,String scale,String dataResidency,String createdAt,String contactName,String contactEmail,String contactPhone,String landline,String address,String postalCode) {}
