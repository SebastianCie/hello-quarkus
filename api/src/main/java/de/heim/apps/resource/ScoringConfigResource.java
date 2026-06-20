package de.heim.apps.resource;

import de.heim.apps.entity.ScoringConfig;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.UUID;

@Path("/api/v1/scoring-configs")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ScoringConfigResource {

    @GET
    public List<ScoringConfig> list(@QueryParam("compId") UUID compId) {
        if (compId != null)
            return ScoringConfig.list("compId = ?1 ORDER BY sortOrder ASC", compId);
        return ScoringConfig.listAll();
    }

    @POST
    @Transactional
    public Response create(ScoringConfig entity) {
        entity.id = null;
        long count = ScoringConfig.count("compId", entity.compId);
        entity.sortOrder = (int) count;
        entity.persist();
        return Response.status(201).entity(entity).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") UUID id, ScoringConfig data) {
        ScoringConfig entity = ScoringConfig.findById(id);
        if (entity == null) return Response.status(404).build();
        entity.eventType = data.eventType;
        entity.points = data.points;
        entity.label = data.label;
        entity.sortOrder = data.sortOrder;
        return Response.ok(entity).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        return ScoringConfig.deleteById(id) ? Response.noContent().build() : Response.status(404).build();
    }

    /** Ersetzt alle Regeln eines Wettkampfs in einer Transaktion (für Presets). */
    @POST
    @Path("/replace")
    @Transactional
    public Response replace(@QueryParam("compId") UUID compId, List<ScoringConfig> rules) {
        if (compId == null) return Response.status(400).build();
        ScoringConfig.delete("compId", compId);
        for (int i = 0; i < rules.size(); i++) {
            ScoringConfig rule = rules.get(i);
            rule.id = null;
            rule.compId = compId;
            rule.sortOrder = i;
            rule.persist();
        }
        return Response.ok(ScoringConfig.list("compId = ?1 ORDER BY sortOrder ASC", compId)).build();
    }
}
