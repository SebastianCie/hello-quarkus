package de.heim.apps.resource;

import de.heim.apps.entity.CompetitionCategory;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.UUID;

@Path("/api/competition-categories")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CompetitionCategoryResource {

    @GET
    public List<CompetitionCategory> list(@QueryParam("compId") UUID compId) {
        if (compId != null) return CompetitionCategory.list("compId", compId);
        return CompetitionCategory.listAll();
    }

    @GET
    @Path("/{id}")
    public Response get(@PathParam("id") UUID id) {
        CompetitionCategory entity = CompetitionCategory.findById(id);
        return entity != null ? Response.ok(entity).build() : Response.status(404).build();
    }

    @POST
    @Transactional
    public Response create(CompetitionCategory entity) {
        entity.id = null;
        entity.persist();
        return Response.status(201).entity(entity).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") UUID id, CompetitionCategory data) {
        CompetitionCategory entity = CompetitionCategory.findById(id);
        if (entity == null) return Response.status(404).build();
        entity.compId = data.compId;
        entity.name = data.name;
        entity.gender = data.gender;
        entity.ageMin = data.ageMin;
        entity.ageMax = data.ageMax;
        entity.maxParticipants = data.maxParticipants;
        return Response.ok(entity).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        return CompetitionCategory.deleteById(id) ? Response.noContent().build() : Response.status(404).build();
    }
}
