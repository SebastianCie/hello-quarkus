package de.heim.apps.resource;

import de.heim.apps.service.KeycloakAdminService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;
import java.util.Optional;

@Path("/api/v1/account")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AccountResource {

    @Inject
    Logger log;

    @Inject
    KeycloakAdminService keycloak;

    public record RegisterRequest(String username, String email, String password) {}
    public record MessageResponse(String message) {}

    @POST
    @Path("/register")
    public Response register(RegisterRequest req) {
        if (req == null || req.username() == null || req.username().isBlank()) {
            log.warn("Registration rejected: username missing");
            return Response.status(400).entity(new MessageResponse("Username is required")).build();
        }
        if (req.password() == null || req.password().length() < 8) {
            log.warn("Registration rejected: password too short for user=" + req.username());
            return Response.status(400).entity(new MessageResponse("Password must be at least 8 characters")).build();
        }

        if (!keycloak.isEnabled()) {
            log.infof("Registration [dev-mode]: username=%s", req.username());
            return Response.ok(new MessageResponse("dev-mode: Keycloak skipped")).build();
        }

        try {
            keycloak.createUser(req.username(), req.password(), Optional.ofNullable(req.email()));
            log.infof("Account created: username=%s", req.username());
            return Response.status(201).entity(new MessageResponse("Account created. Please log in.")).build();
        } catch (WebApplicationException e) {
            log.warnf("Account creation failed for username=%s: HTTP %d", req.username(), e.getResponse().getStatus());
            throw e;
        } catch (Exception e) {
            log.errorf(e, "Unexpected error during account creation for username=%s", req.username());
            return Response.status(500).entity(new MessageResponse("Internal error: " + e.getMessage())).build();
        }
    }
}
