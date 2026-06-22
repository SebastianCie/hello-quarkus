package de.heim.apps.service;

import de.heim.apps.entity.*;
import io.quarkus.mailer.Mail;
import io.quarkus.mailer.Mailer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.UUID;

@ApplicationScoped
public class AuthService {

    @Inject
    PasswordService passwordService;

    @Inject
    TokenService tokenService;

    @Inject
    Mailer mailer;

    @ConfigProperty(name = "beta-battle.frontend-url", defaultValue = "http://localhost:5173")
    String frontendUrl;

    public record TokenPair(String accessToken, String refreshToken) {}

    @Transactional
    public void register(String email, String password, String displayName) {
        if (email == null || !email.contains("@")) {
            throw new WebApplicationException("Invalid email address", Response.Status.BAD_REQUEST);
        }
        if (password == null || password.length() < 8) {
            throw new WebApplicationException("Password must be at least 8 characters", Response.Status.BAD_REQUEST);
        }

        String normalizedEmail = email.trim().toLowerCase();
        if (User.findByEmail(normalizedEmail) != null) {
            throw new WebApplicationException("Email already registered", Response.Status.CONFLICT);
        }

        User user = new User();
        user.email = normalizedEmail;
        user.passwordHash = passwordService.hash(password);
        user.displayName = displayName;
        user.role = "ORGANIZER";
        user.emailVerified = false;
        user.persist();

        String token = UUID.randomUUID().toString();
        EmailVerification ev = new EmailVerification();
        ev.userId = user.id;
        ev.tokenHash = sha256(token);
        ev.expiresAt = OffsetDateTime.now().plusHours(24);
        ev.persist();

        mailer.send(Mail.withText(
                user.email,
                "BetaBattle – E-Mail bestätigen",
                "Bitte bestätige deine E-Mail-Adresse (gültig 24 Stunden):\n\n"
                        + frontendUrl + "/verify-email?token=" + token
        ));
    }

    @Transactional
    public void verifyEmail(String token) {
        if (token == null || token.isBlank()) {
            throw new WebApplicationException("Token missing", Response.Status.BAD_REQUEST);
        }
        EmailVerification ev = EmailVerification.findByTokenHash(sha256(token));
        if (ev == null) {
            throw new WebApplicationException("Invalid or expired verification token", Response.Status.BAD_REQUEST);
        }
        User user = User.findById(ev.userId);
        if (user == null) {
            throw new WebApplicationException("User not found", Response.Status.NOT_FOUND);
        }
        user.emailVerified = true;
        ev.delete();
    }

    @Transactional
    public TokenPair login(String email, String password) {
        if (email == null || password == null) {
            throw new WebApplicationException("Email and password required", Response.Status.BAD_REQUEST);
        }
        User user = User.findByEmail(email.trim().toLowerCase());
        if (user == null || !passwordService.verify(password, user.passwordHash)) {
            throw new WebApplicationException("Invalid credentials", Response.Status.UNAUTHORIZED);
        }
        if (!user.emailVerified) {
            throw new WebApplicationException("Email address not verified", 403);
        }
        return issueTokenPair(user);
    }

    @Transactional
    public TokenPair refresh(String opaqueToken) {
        RefreshToken rt = RefreshToken.findValid(sha256(opaqueToken));
        if (rt == null) {
            throw new WebApplicationException("Invalid or expired refresh token", Response.Status.UNAUTHORIZED);
        }
        rt.revoked = true;

        User user = User.findById(rt.userId);
        if (user == null) {
            throw new WebApplicationException("User not found", Response.Status.UNAUTHORIZED);
        }
        return issueTokenPair(user);
    }

    @Transactional
    public void logout(String opaqueToken) {
        if (opaqueToken == null || opaqueToken.isBlank()) return;
        RefreshToken rt = RefreshToken.findValid(sha256(opaqueToken));
        if (rt != null) rt.revoked = true;
    }

    @Transactional
    public void requestPasswordReset(String email) {
        if (email == null) return;
        User user = User.findByEmail(email.trim().toLowerCase());
        if (user == null) return; // Existenz nicht preisgeben

        String token = UUID.randomUUID().toString();
        PasswordResetToken prt = new PasswordResetToken();
        prt.userId = user.id;
        prt.tokenHash = sha256(token);
        prt.expiresAt = OffsetDateTime.now().plusHours(1);
        prt.persist();

        mailer.send(Mail.withText(
                user.email,
                "BetaBattle – Passwort zurücksetzen",
                "Link zum Zurücksetzen (gültig 1 Stunde):\n\n"
                        + frontendUrl + "/reset-password?token=" + token
                        + "\n\nFalls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail."
        ));
    }

    @Transactional
    public void confirmPasswordReset(String token, String newPassword) {
        if (newPassword == null || newPassword.length() < 8) {
            throw new WebApplicationException("Password must be at least 8 characters", Response.Status.BAD_REQUEST);
        }
        PasswordResetToken prt = PasswordResetToken.findValid(sha256(token));
        if (prt == null) {
            throw new WebApplicationException("Invalid or expired reset token", Response.Status.BAD_REQUEST);
        }
        User user = User.findById(prt.userId);
        if (user == null) {
            throw new WebApplicationException("User not found", Response.Status.NOT_FOUND);
        }
        user.passwordHash = passwordService.hash(newPassword);
        prt.used = true;

        // Alle aktiven Refresh Tokens des Users invalidieren
        RefreshToken.update("revoked = true WHERE userId = ?1 AND revoked = false", user.id);
    }

    private TokenPair issueTokenPair(User user) {
        String accessToken = tokenService.issueAccessToken(user);
        String opaqueRefreshToken = UUID.randomUUID().toString();

        RefreshToken rt = new RefreshToken();
        rt.userId = user.id;
        rt.tokenHash = sha256(opaqueRefreshToken);
        rt.expiresAt = OffsetDateTime.now().plusDays(30);
        rt.persist();

        return new TokenPair(accessToken, opaqueRefreshToken);
    }

    public String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }
}
