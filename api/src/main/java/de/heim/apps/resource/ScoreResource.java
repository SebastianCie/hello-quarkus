package de.heim.apps.resource;

import de.heim.apps.entity.Score;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.UUID;

@Path("/api/v1/scores")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ScoreResource {

    @GET
    public List<Score> list(@QueryParam("registrationId") UUID registrationId,
                            @QueryParam("athleteId") UUID athleteId) {
        if (registrationId != null) return Score.list("registrationId", registrationId);
        if (athleteId != null) return Score.list("athleteId", athleteId);
        return Score.listAll();
    }

    @GET
    @Path("/{id}")
    public Response get(@PathParam("id") UUID id) {
        Score entity = Score.findById(id);
        return entity != null ? Response.ok(entity).build() : Response.status(404).build();
    }

    @POST
    @Transactional
    public Response create(Score entity) {
        entity.id = null;
        entity.persist();
        return Response.status(201).entity(entity).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") UUID id, Score data) {
        Score entity = Score.findById(id);
        if (entity == null) return Response.status(404).build();
        entity.attempts = data.attempts;
        entity.topped = data.topped;
        entity.zoned = data.zoned;
        entity.bonusPoints = data.bonusPoints;
        entity.finalScore = data.finalScore;
        entity.judgeId = data.judgeId;
        return Response.ok(entity).build();
    }

    @PUT
    @Path("/upsert")
    @Transactional
    public Response upsert(Score data) {
        Score existing = Score.find("registrationId = ?1 and routeId = ?2",
                data.registrationId, data.routeId).firstResult();
        if (existing != null) {
            existing.attempts = data.attempts;
            existing.topped = data.topped;
            existing.zoned = data.zoned;
            existing.bonusPoints = data.bonusPoints;
            existing.finalScore = data.finalScore;
            return Response.ok(existing).build();
        }
        data.id = null;
        data.persist();
        return Response.status(201).entity(data).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        return Score.deleteById(id) ? Response.noContent().build() : Response.status(404).build();
    }
}
