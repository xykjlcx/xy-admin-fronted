package com.metabuild.shared.kernel.security;

public sealed interface AuthorizationState
        permits AuthorizationSnapshot, AuthorizationFence {}
