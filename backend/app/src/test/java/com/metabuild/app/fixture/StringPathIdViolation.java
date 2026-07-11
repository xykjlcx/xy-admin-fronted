package com.metabuild.app.fixture;

import org.springframework.web.bind.annotation.PathVariable;

public final class StringPathIdViolation {

    public void load(@PathVariable String userId) {}
}
