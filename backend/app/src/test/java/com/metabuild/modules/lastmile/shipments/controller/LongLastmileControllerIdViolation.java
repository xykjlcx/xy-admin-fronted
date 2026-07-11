package com.metabuild.modules.lastmile.shipments.controller;

public final class LongLastmileControllerIdViolation {

    public Response load(Long shipmentId) {
        return new Response(shipmentId);
    }

    public record Response(Long id) {}
}
