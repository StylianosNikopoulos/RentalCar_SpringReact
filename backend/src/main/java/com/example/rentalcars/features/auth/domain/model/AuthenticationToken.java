package com.example.rentalcars.features.auth.domain.model;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AuthenticationToken {
    @NotBlank
    String accessToken;
    @NotBlank
    String refreshToken;
}