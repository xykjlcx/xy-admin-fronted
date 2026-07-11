package com.metabuild.app.fixture;

import org.springframework.web.bind.annotation.PathVariable;

public final class LongPathIdViolation {

    public void load(@PathVariable Long userId) {}
}
