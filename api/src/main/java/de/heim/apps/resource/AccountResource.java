package de.heim.apps.resource;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;

/**
 * Registrierung wurde zu POST /auth/register verschoben.
 */
@Path("/api/v1/account")
@Produces(MediaType.APPLICATION_JSON)
public class AccountResource {

    @POST
    @Path("/register")
    public Response register() {
        return Response.status(410)
                .entity(Map.of("message", "Endpoint moved. Use POST /auth/register instead."))
                .build();
    }
}
