package com.metabuild.modules.admin.dashboard.application;
import java.util.Map;import java.util.UUID; public interface DashboardRepository {Map<String,Object> overview(UUID userId,int months);}
