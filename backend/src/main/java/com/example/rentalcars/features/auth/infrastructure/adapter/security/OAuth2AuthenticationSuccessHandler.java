package com.example.rentalcars.features.auth.infrastructure.adapter.security;

import com.example.rentalcars.features.auth.domain.port.outbound.AuthEmailPort;
import com.example.rentalcars.features.auth.domain.port.outbound.IdentityPort;
import com.example.rentalcars.features.user.domain.exception.UserNotFoundException;
import com.example.rentalcars.features.user.domain.model.User;
import com.example.rentalcars.features.user.domain.port.inbound.UserService;
import com.example.rentalcars.features.user.infrastructure.adapter.inbound.rest.dto.UserRequest;
import com.nimbusds.oauth2.sdk.util.StringUtils;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Objects;
import java.util.UUID;

@Slf4j
@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Value("${APP_FRONTEND_URL}")
    private String frontendUrl;

    private final UserService userService;
    private final IdentityPort identityPort;
    private final AuthEmailPort authEmailPort;

    public OAuth2AuthenticationSuccessHandler(
            @Lazy UserService userService,
            IdentityPort identityPort,
            AuthEmailPort authEmailPort
    ) {
        this.userService = userService;
        this.identityPort = identityPort;
        this.authEmailPort = authEmailPort;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String email = oAuth2User.getAttribute("email");
        String firstName = oAuth2User.getAttribute("given_name");
        String lastName = oAuth2User.getAttribute("family_name");

        if (StringUtils.isBlank(firstName)) {
            String fullName = oAuth2User.getAttribute("name");
            firstName = (StringUtils.isBlank(fullName)) ? Objects.requireNonNull(fullName).split(" ")[0] : "User";
        }

        if (StringUtils.isBlank(lastName)) {
            lastName = "";
        }

        User user = findOrCreateUser(email, firstName, lastName);
        var tokens = identityPort.generateTokens(user);

        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth2/redirect")
                .queryParam("accessToken", tokens.getAccessToken())
                .queryParam("refreshToken", tokens.getRefreshToken())
                .build()
                .toUriString();

        clearAuthenticationAttributes(request);
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }

    private User findOrCreateUser(String email, String firstName, String lastName) {
        try {
            return userService.getInternalUserByEmail(email);
        } catch (UserNotFoundException e) {
            var userRequest = UserRequest.builder()
                    .email(email)
                    .password(UUID.randomUUID().toString())
                    .firstName(firstName)
                    .lastName(lastName)
                    .build();

            User newUser = userService.register(userRequest);

            try {
                authEmailPort.sendWelcomeEmail(newUser.getEmail(), newUser.getFirstName());
            } catch (Exception ex) {
                log.error("Failed to send welcome email to OAuth user {}: {}", email, ex.getMessage());
            }

            return newUser;
        }
    }
}