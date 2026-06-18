package de.heim.apps.resource;

import de.heim.apps.entity.Competition;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/api/v1/competitions")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CompetitionResource {

    @GET
    public List<Competition> list(@QueryParam("orgId") UUID orgId,
                                  @QueryParam("locationId") UUID locationId) {
        if (locationId != null) return Competition.list("locationId", locationId);
        if (orgId != null) return Competition.list("orgId", orgId);
        return Competition.listAll();
    }

    @GET
    @Path("/{id}")
    public Response get(@PathParam("id") UUID id) {
        Competition entity = Competition.findById(id);
        return entity != null ? Response.ok(entity).build() : Response.status(404).build();
    }

    private Response validateDates(Competition data) {
        if (data.startDate != null && data.endDate != null && !data.startDate.isBefore(data.endDate)) {
            return Response.status(400).entity(Map.of("message", "Startdatum muss vor dem Enddatum liegen.")).build();
        }
        return null;
    }

    @POST
    @Transactional
    public Response create(Competition entity) {
        Response err = validateDates(entity);
        if (err != null) return err;
        entity.id = null;
        entity.persist();
        return Response.status(201).entity(entity).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") UUID id, Competition data) {
        Response err = validateDates(data);
        if (err != null) return err;
        Competition entity = Competition.findById(id);
        if (entity == null) return Response.status(404).build();
        entity.name = data.name;
        entity.slug = data.slug;
        entity.discipline = data.discipline;
        entity.format = data.format;
        entity.status = data.status;
        entity.startDate = data.startDate;
        entity.endDate = data.endDate;
        entity.venue = data.venue;
        entity.locationId = data.locationId;
        entity.selfRegistration = data.selfRegistration;
        entity.registrationOpensAt = data.registrationOpensAt;
        entity.registrationClosesAt = data.registrationClosesAt;
        return Response.ok(entity).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        return Competition.deleteById(id) ? Response.noContent().build() : Response.status(404).build();
    }
}
