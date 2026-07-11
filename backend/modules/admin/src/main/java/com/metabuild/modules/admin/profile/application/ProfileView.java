package com.metabuild.modules.admin.profile.application;
import java.util.UUID;
public record ProfileView(UUID id,String name,String email,String phone,String company,String department,String role,String location,String employeeNo,String title,String joinedAt,String manager,String language,String timezone,String bio,boolean emailVerified,String lastActive){}
