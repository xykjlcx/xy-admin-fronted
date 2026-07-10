package com.metabuild.modules.admin.users;

import cn.dev33.satoken.fixture.FakeSaTokenType;

public record SaTokenIsolationViolation(FakeSaTokenType saTokenType) {}
