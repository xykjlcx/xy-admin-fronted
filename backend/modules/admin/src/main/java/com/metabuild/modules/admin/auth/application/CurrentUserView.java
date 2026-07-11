package com.metabuild.modules.admin.auth.application;

import com.metabuild.shared.kernel.security.AuthorizationSnapshot;

public record CurrentUserView(CurrentUserRepository.UserIdentity user, AuthorizationSnapshot authorization) {}
