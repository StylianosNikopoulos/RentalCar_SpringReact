package com.example.rentalcars.features.auth.infrastructure.adapter.security;

import com.example.rentalcars.features.auth.domain.model.AuthenticationToken;
import com.example.rentalcars.features.auth.domain.port.outbound.IdentityPort;
import com.example.rentalcars.features.auth.service.RefreshTokenService;
import com.example.rentalcars.features.user.domain.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class IdentityAdapter implements IdentityPort {
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    @Override
    public void authenticate(String email, String password) {
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, password));
    }

    @Override
    public AuthenticationToken generateTokens(User user) {
        String accessToken = jwtService.generateToken(user);
        var refreshToken = refreshTokenService.createRefreshToken(user);

        return AuthenticationToken.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .build();
    }
}