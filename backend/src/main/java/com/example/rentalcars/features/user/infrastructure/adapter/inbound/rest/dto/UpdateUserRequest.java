package com.example.rentalcars.features.user.infrastructure.adapter.inbound.rest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {
    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @Pattern(
            regexp = "^(\\+30|0030)?(2[0-9]{9}|69[0-9]{8})$",
            message = "Invalid Greek phone number format"
    )
    private String phoneNumber;

    private String address;

    @Pattern(
            regexp = "^(AM|A1|A2|A|B|B1|BE|C1|C|D)$",
            message = "Please select a valid license category (AM, A1, A2, A, B, B1, BE, C1, C, D)"
    )
    private String driverLicenseNumber;
}