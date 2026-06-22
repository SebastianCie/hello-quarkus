package de.heim.apps.resource;

import de.heim.apps.service.AuthService;
import de.heim.apps.service.TokenService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.*;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.Map;

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AuthResource {

    @Inject
    AuthService authService;

    @Inject
    TokenService tokenService;

    @ConfigProperty(name = "beta-battle.cookie.secure", defaultValue = "true")
    boolean cookieSecure;

    private static final String REFRESH_COOKIE  = "refresh_token";
    private static final int    COOKIE_MAX_AGE  = 30 * 24 * 60 * 60; // 30 Tage in Sekunden
    private static final int    ACCESS_LIFETIME = 900;               // 15 Minuten in Sekunden

    // --- DTOs ---

    public record RegisterRequest(String email, String password, String displayName) {}
    public record LoginRequest(String email, String password) {}
    public record TokenResponse(String access_token, String token_type, int expires_in) {}
    public record PasswordResetRequest(String email) {}
    public record PasswordResetConfirm(String token, String newPassword) {}
    public record MessageResponse(String message) {}

    // --- Endpoints ---

    @POST
    @Path("/register")
    public Response register(RegisterRequest req) {
        authService.register(req.email(), req.password(), req.displayName());
        return Response.status(Response.Status.CREATED)
                .entity(new MessageResponse("Registration successful. Please check your email to verify your address."))
                .build();
    }

    @GET
    @Path("/verify-email")
    public Response verifyEmail(@QueryParam("token") String token) {
        authService.verifyEmail(token);
        return Response.ok(new MessageResponse("Email verified successfully. You can now log in.")).build();
    }

    @POST
    @Path("/login")
    public Response login(LoginRequest req) {
        AuthService.TokenPair pair = authService.login(req.email(), req.password());
        return Response.ok(new TokenResponse(pair.accessToken(), "Bearer", ACCESS_LIFETIME))
                .cookie(buildRefreshCookie(pair.refreshToken(), COOKIE_MAX_AGE))
                .build();
    }

    /**
     * Tauscht den Refresh Token (HttpOnly Cookie) gegen ein neues Access Token.
     * Rotation: alter Refresh Token wird revoked, neuer wird gesetzt.
     */
    @POST
    @Path("/token")
    public Response refreshToken(@CookieParam(REFRESH_COOKIE) String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(new MessageResponse("Refresh token missing")).build();
        }
        AuthService.TokenPair pair = authService.refresh(refreshToken);
        return Response.ok(new TokenResponse(pair.accessToken(), "Bearer", ACCESS_LIFETIME))
                .cookie(buildRefreshCookie(pair.refreshToken(), COOKIE_MAX_AGE))
                .build();
    }

    @POST
    @Path("/logout")
    public Response logout(@CookieParam(REFRESH_COOKIE) String refreshToken) {
        authService.logout(refreshToken);
        return Response.ok(new MessageResponse("Logged out"))
                .cookie(buildRefreshCookie("", 0))
                .build();
    }

    @POST
    @Path("/password-reset/request")
    public Response requestPasswordReset(PasswordResetRequest req) {
        authService.requestPasswordReset(req.email());
        // Immer dieselbe Antwort – User-Existenz nicht preisgeben
        return Response.ok(new MessageResponse("If an account with that email exists, a reset link has been sent.")).build();
    }

    @POST
    @Path("/password-reset/confirm")
    public Response confirmPasswordReset(PasswordResetConfirm req) {
        authService.confirmPasswordReset(req.token(), req.newPassword());
        return Response.ok(new MessageResponse("Password reset successful. Please log in with your new password.")).build();
    }

    @GET
    @Path("/.well-known/jwks.json")
    public Map<String, Object> jwks() {
        return tokenService.getJwks();
    }

    private NewCookie buildRefreshCookie(String value, int maxAge) {
        return new NewCookie.Builder(REFRESH_COOKIE)
                .value(value)
                .path("/auth/token")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(NewCookie.SameSite.STRICT)
                .maxAge(maxAge)
                .build();
    }
}
