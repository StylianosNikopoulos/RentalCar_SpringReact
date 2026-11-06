package com.example.rentalcars.features.auth.service;

import com.example.rentalcars.core.exception.BusinessException;
import com.example.rentalcars.features.auth.domain.exception.EmailAlreadyExistsException;
import com.example.rentalcars.features.auth.domain.exception.InvalidCredentialsException;
import com.example.rentalcars.features.auth.domain.port.inbound.AuthService;
import com.example.rentalcars.features.auth.domain.port.outbound.AuthEmailPort;
import com.example.rentalcars.features.auth.domain.port.outbound.IdentityPort;
import com.example.rentalcars.features.auth.infrastructure.adapter.inbound.rest.dto.AuthResponse;
import com.example.rentalcars.features.auth.infrastructure.adapter.inbound.rest.dto.LoginRequest;
import com.example.rentalcars.features.auth.infrastructure.adapter.inbound.rest.dto.RegisterRequest;
import com.example.rentalcars.features.auth.infrastructure.adapter.inbound.rest.mapper.UserRestMapper;
import com.example.rentalcars.features.user.domain.exception.UserNotFoundException;
import com.example.rentalcars.features.user.domain.model.User;
import com.example.rentalcars.features.user.domain.port.inbound.UserService;
import com.example.rentalcars.features.user.infrastructure.adapter.inbound.rest.dto.UserRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final IdentityPort identityPort;
    private final UserService userService;
    private final UserRestMapper userRestMapper;
    private final PasswordEncoder passwordEncoder;
    private final AuthEmailPort authEmailPort;

    @Override
    public AuthResponse login(LoginRequest request) {
        try {
            identityPort.authenticate(request.getEmail(), request.getPassword());
        } catch (Exception e) {
            throw new InvalidCredentialsException();
        }

        var user = userService.getInternalUserByEmail(request.getEmail());
        var token = identityPort.generateTokens(user);

        return AuthResponse.builder()
                .accessToken(token.getAccessToken())
                .refreshToken(token.getRefreshToken())
                .user(userRestMapper.toResponse(user))
                .build();
    }

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userService.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException();
        }

        var userRequest = UserRequest.builder()
                .email(request.getEmail())
                .password(request.getPassword())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .build();

        var user = userService.register(userRequest);
        var token = identityPort.generateTokens(user);

        try {
            authEmailPort.sendWelcomeEmail(user.getEmail(), user.getFirstName());
            log.info("Sent registration confirmation email to: {}", user.getEmail());
        } catch (Exception e) {
            log.error("Failed to send welcome email to {}: {}", user.getEmail(), e.getMessage());
        }

        return AuthResponse.builder()
                .accessToken(token.getAccessToken())
                .refreshToken(token.getRefreshToken())
                .user(userRestMapper.toResponse(user))
                .build();
    }

    @Override
    @Transactional
    public AuthResponse refreshTokenByUserId(UUID userId) {
        User user = userService.getUserById(userId);
        var token = identityPort.generateTokens(user);

        return AuthResponse.builder()
                .accessToken(token.getAccessToken())
                .refreshToken(token.getRefreshToken())
                .user(userRestMapper.toResponse(user))
                .build();
    }

    @Override
    @Transactional
    public void resetPassword(String token, String newPassword) {
        User user = userService.findByResetToken(token)
                .orElseThrow(() -> new BusinessException("Invalid reset token", "INVALID_TOKEN"));

        if (user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new BusinessException("Reset token has expired", "TOKEN_EXPIRED");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userService.save(user);
    }

    @Override
    @Transactional
    public void forgotPassword(String email) {
        try {
            User user = userService.getInternalUserByEmail(email);
            String token = UUID.randomUUID().toString();
            user.setResetToken(token);
            user.setResetTokenExpiry(LocalDateTime.now().plusHours(1));
            userService.save(user);

            authEmailPort.sendPasswordResetEmail(email, token);
            log.info("Sent password reset email to {}", email);
        } catch (UserNotFoundException e) {
            log.warn("Password reset requested for non existing email: {}", email);
        }
    }
}