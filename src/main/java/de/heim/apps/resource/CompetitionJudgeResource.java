package de.heim.apps.resource;

import de.heim.apps.entity.CompetitionJudge;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.UUID;

@Path("/api/competition-judges")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CompetitionJudgeResource {

    @GET
    public List<CompetitionJudge> list(@QueryParam("compId") UUID compId) {
        if (compId != null) return CompetitionJudge.list("compId", compId);
        return CompetitionJudge.listAll();
    }

    @GET
    @Path("/{id}")
    public Response get(@PathParam("id") UUID id) {
        CompetitionJudge entity = CompetitionJudge.findById(id);
        return entity != null ? Response.ok(entity).build() : Response.status(404).build();
    }

    @POST
    @Transactional
    public Response create(CompetitionJudge entity) {
        entity.id = null;
        entity.persist();
        return Response.status(201).entity(entity).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") UUID id, CompetitionJudge data) {
        CompetitionJudge entity = CompetitionJudge.findById(id);
        if (entity == null) return Response.status(404).build();
        entity.compId = data.compId;
        entity.userId = data.userId;
        entity.role = data.role;
        return Response.ok(entity).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        return CompetitionJudge.deleteById(id) ? Response.noContent().build() : Response.status(404).build();
    }
}
