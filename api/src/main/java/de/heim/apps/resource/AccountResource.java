package de.heim.apps.resource;

import de.heim.apps.service.KeycloakAdminService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Optional;

@Path("/api/v1/account")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AccountResource {

    @Inject
    KeycloakAdminService keycloak;

    public record RegisterRequest(String username, String email, String password) {}
    public record MessageResponse(String message) {}

    /**
     * Public endpoint — creates a Keycloak account without requiring prior login.
     * In dev mode (Keycloak disabled) returns 200 immediately for testing.
     */
    @POST
    @Path("/register")
    public Response register(RegisterRequest req) {
        if (req.username() == null || req.username().isBlank())
            return Response.status(400).entity(new MessageResponse("Username is required")).build();
        if (req.password() == null || req.password().length() < 8)
            return Response.status(400).entity(new MessageResponse("Password must be at least 8 characters")).build();

        if (!keycloak.isEnabled()) {
            return Response.ok(new MessageResponse("dev-mode: Keycloak skipped")).build();
        }

        keycloak.createUser(req.username(), req.password(), Optional.ofNullable(req.email()));
        return Response.status(201).entity(new MessageResponse("Account created. Please log in.")).build();
    }
}
