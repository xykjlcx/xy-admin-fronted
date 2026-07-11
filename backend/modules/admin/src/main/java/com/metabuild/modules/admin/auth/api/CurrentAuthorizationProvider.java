package com.metabuild.modules.admin.auth.api;

import com.metabuild.shared.kernel.security.AuthorizationSnapshot;

public interface CurrentAuthorizationProvider { AuthorizationSnapshot current(); }
