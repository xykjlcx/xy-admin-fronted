package com.metabuild.modules.admin.auth.application;

public record RefreshRotationOutcome(Status status, RefreshRotation rotation) {
    public enum Status { SUCCESS, IN_FLIGHT, REJECTED }
    public static RefreshRotationOutcome success(RefreshRotation rotation) { return new RefreshRotationOutcome(Status.SUCCESS, rotation); }
    public static RefreshRotationOutcome inFlight() { return new RefreshRotationOutcome(Status.IN_FLIGHT, null); }
    public static RefreshRotationOutcome rejected() { return new RefreshRotationOutcome(Status.REJECTED, null); }
}
