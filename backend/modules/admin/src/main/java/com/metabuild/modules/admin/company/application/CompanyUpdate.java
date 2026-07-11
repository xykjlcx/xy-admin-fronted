package com.metabuild.modules.admin.company.application;
import java.util.UUID;
public record CompanyUpdate(String name,boolean verified,String domain,String code,String industry,String scale,String dataResidency,String createdAt,String contactName,String contactEmail,String contactPhone,String landline,String address,String postalCode){public CompanyView toView(UUID id){return new CompanyView(id,name,verified,domain,code,industry,scale,dataResidency,createdAt,contactName,contactEmail,contactPhone,landline,address,postalCode);}}
