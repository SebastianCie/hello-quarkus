package de.heim.apps.resource;

import de.heim.apps.entity.AppSettings;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;
import java.util.stream.Collectors;

@Path("/api/v1/settings")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AppSettingsResource {

    @GET
    public Map<String, String> getAll() {
        return AppSettings.<AppSettings>listAll().stream()
                .collect(Collectors.toMap(s -> s.key, s -> s.value));
    }

    @PUT
    @Path("/{key}")
    @Transactional
    public Response update(@PathParam("key") String key, Map<String, String> body) {
        String value = body.get("value");
        if (value == null) return Response.status(400).build();
        AppSettings entity = AppSettings.findById(key);
        if (entity == null) {
            entity = new AppSettings();
            entity.key = key;
            entity.value = value;
            entity.persist();
            return Response.status(201).entity(entity).build();
        }
        entity.value = value;
        return Response.ok(entity).build();
    }
}
