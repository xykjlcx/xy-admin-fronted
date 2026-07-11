package com.metabuild.modules.admin.users.api;
import com.metabuild.admin.api.*; import com.metabuild.modules.admin.users.application.UserRepository; import java.util.Set; import java.util.UUID;
public final class UserDirectoryAdapter implements UserDirectoryApi { private final UserRepository users; public UserDirectoryAdapter(UserRepository users){this.users=users;} public BatchResult<UUID,UserSummary> batchGetUsers(Set<UUID> ids){return users.batchGet(ids);} }
