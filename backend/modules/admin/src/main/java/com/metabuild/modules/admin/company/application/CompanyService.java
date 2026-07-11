package com.metabuild.modules.admin.company.application;

import com.metabuild.shared.kernel.BadRequest;
import java.net.IDN;
import java.time.LocalDate;
import java.util.UUID;

public final class CompanyService {
    private final CompanyRepository repository;
    public CompanyService(CompanyRepository repository) { this.repository = repository; }
    public CompanyView get() { return repository.get(); }
    public CompanyView update(UUID actorId, CompanyUpdate value) { validate(value); return repository.update(actorId, value); }

    private static void validate(CompanyUpdate value) {
        if (value == null
                || invalid(value.name(), 1, 200) || invalid(value.domain(), 1, 253)
                || invalid(value.code(), 1, 64) || invalid(value.industry(), 1, 200)
                || invalid(value.scale(), 1, 64) || invalid(value.dataResidency(), 1, 128)
                || invalid(value.createdAt(), 1, 10) || invalid(value.contactName(), 1, 128)
                || invalid(value.contactEmail(), 1, 320) || invalid(value.contactPhone(), 1, 64)
                || invalid(value.landline(), 0, 64) || invalid(value.address(), 1, 512)
                || invalid(value.postalCode(), 1, 32)) throw invalid();
        try {
            LocalDate.parse(value.createdAt());
            String ascii = IDN.toASCII(value.domain());
            if (!ascii.matches("(?i)^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$")
                    || !emailValid(value.contactEmail())) throw invalid();
        } catch (RuntimeException failure) {
            if (failure instanceof BadRequest badRequest) throw badRequest;
            throw invalid();
        }
    }

    private static boolean invalid(String value, int min, int max) {
        if (value == null) return true;
        int length = value.trim().length();
        return length < min || length > max;
    }

    private static boolean emailValid(String email) {
        if (email == null || email.length() > 320) return false;
        int at = email.indexOf('@');
        if (at < 1 || at != email.lastIndexOf('@')) return false;
        String local = email.substring(0, at), domain = email.substring(at + 1);
        if (local.startsWith(".") || local.endsWith(".") || local.contains("..")
                || !local.matches("[A-Za-z0-9.!#$%&'*+/=?^_{}|~-]+")) return false;
        try {
            String[] labels = IDN.toASCII(domain).split("\\.", -1);
            if (labels.length < 2 || labels[labels.length - 1].length() < 2) return false;
            for (String label : labels) {
                if (label.isEmpty() || label.length() > 63
                        || !label.matches("(?i)^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$")) return false;
            }
            return true;
        } catch (RuntimeException ignored) { return false; }
    }

    private static BadRequest invalid() {
        return new BadRequest(() -> "request.validation.failed", "Company payload is invalid");
    }
}
