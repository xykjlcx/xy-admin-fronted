package com.metabuild.modules.admin.auth.application;
import java.util.UUID;
@FunctionalInterface public interface CredentialRevisionReader {long credentialRevision(UUID userId);}
