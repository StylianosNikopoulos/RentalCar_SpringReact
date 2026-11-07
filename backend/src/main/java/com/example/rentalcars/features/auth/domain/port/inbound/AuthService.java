package com.example.rentalcars.features.auth.domain.port.inbound;

import com.example.rentalcars.features.auth.infrastructure.adapter.inbound.rest.dto.AuthResponse;
import com.example.rentalcars.features.auth.infrastructure.adapter.inbound.rest.dto.LoginRequest;
import com.example.rentalcars.features.auth.infrastructure.adapter.inbound.rest.dto.RegisterRequest;

import java.util.UUID;

public interface AuthService {
    AuthResponse login(LoginRequest request);
    AuthResponse register(RegisterRequest request);
    AuthResponse refreshTokenByUserId(UUID userId);
    void resetPassword(String token, String newPassword);
    void forgotPassword(String email);
    AuthResponse refreshToken(String refreshToken);
}