package com.example.rentalcars.features.vehicle.domain.model;

import com.example.rentalcars.core.exception.BusinessException;

import java.io.Serial;
import java.io.Serializable;

public record LicensePlate(String value) implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    public LicensePlate {
        if (value == null || !value.matches("^[A-Z]{3}-?\\d{4}$")) {
            throw new BusinessException("Invalid license plate format. Expected format like ABC-1234", "INVALID_LICENSE_PLATE");
        }
    }
}