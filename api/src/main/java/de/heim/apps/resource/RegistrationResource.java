package de.heim.apps.resource;

import de.heim.apps.entity.Registration;
import de.heim.apps.service.ScoreboardEvents;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.UUID;

@Path("/api/v1/registrations")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class RegistrationResource {

    @Inject
    ScoreboardEvents scoreboardEvents;

    @GET
    public List<Registration> list(@QueryParam("compId") UUID compId,
                                   @QueryParam("athleteId") UUID athleteId) {
        if (compId != null && athleteId != null)
            return Registration.list("compId = ?1 and athleteId = ?2", compId, athleteId);
        if (compId != null) return Registration.list("compId", compId);
        if (athleteId != null) return Registration.list("athleteId", athleteId);
        return Registration.listAll();
    }

    @GET
    @Path("/{id}")
    public Response get(@PathParam("id") UUID id) {
        Registration entity = Registration.findById(id);
        return entity != null ? Response.ok(entity).build() : Response.status(404).build();
    }

    @POST
    @Transactional
    public Response create(Registration entity) {
        entity.id = null;
        entity.persist();
        return Response.status(201).entity(entity).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") UUID id, Registration data) {
        Registration entity = Registration.findById(id);
        if (entity == null) return Response.status(404).build();
        if (data.compId != null) entity.compId = data.compId;
        if (data.athleteId != null) entity.athleteId = data.athleteId;
        entity.categoryId = data.categoryId;
        if (data.status != null) entity.status = data.status;
        if (data.startNumber != null) entity.startNumber = data.startNumber;
        if (data.confirmedAt != null) entity.confirmedAt = data.confirmedAt;
        scoreboardEvents.emit(entity.compId.toString());
        return Response.ok(entity).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        return Registration.deleteById(id) ? Response.noContent().build() : Response.status(404).build();
    }
}
