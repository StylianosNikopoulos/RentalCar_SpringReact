package com.example.rentalcars.features.auth.domain.port.outbound;

public interface AuthEmailPort {
    void sendPasswordResetEmail(String toEmail, String token);
    void sendWelcomeEmail(String email, String firstName);
}