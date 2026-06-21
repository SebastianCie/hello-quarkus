package de.heim.apps.resource;

import de.heim.apps.entity.Athlete;
import de.heim.apps.entity.CompetitionRound;
import de.heim.apps.entity.Registration;
import de.heim.apps.entity.RoundParticipant;
import de.heim.apps.service.ScoreboardEvents;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Path("/api/v1/registrations")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class RegistrationResource {

    @Inject
    ScoreboardEvents scoreboardEvents;

    record RegistrationWithAthlete(Registration registration, Athlete athlete) {}

    @GET
    public Response list(@QueryParam("compId") UUID compId,
                         @QueryParam("athleteId") UUID athleteId) {
        List<Registration> regs;
        if (compId != null && athleteId != null)
            regs = Registration.list("compId = ?1 and athleteId = ?2", compId, athleteId);
        else if (compId != null) regs = Registration.list("compId", compId);
        else if (athleteId != null) regs = Registration.list("athleteId", athleteId);
        else regs = Registration.listAll();

        if (compId == null) return Response.ok(regs).build();

        List<UUID> athleteIds = regs.stream().map(r -> r.athleteId).distinct().toList();
        Map<UUID, Athlete> athleteMap = athleteIds.isEmpty() ? Map.of()
                : Athlete.<Athlete>list("id in ?1", athleteIds).stream()
                        .collect(Collectors.toMap(a -> a.id, a -> a));

        List<RegistrationWithAthlete> result = regs.stream()
                .map(r -> new RegistrationWithAthlete(r, athleteMap.get(r.athleteId)))
                .toList();
        return Response.ok(result).build();
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
        boolean wasConfirmed = "CONFIRMED".equals(entity.status);
        if (data.status != null) entity.status = data.status;
        if (data.startNumber != null) entity.startNumber = data.startNumber;
        if (data.confirmedAt != null) entity.confirmedAt = data.confirmedAt;

        // When an athlete is newly confirmed, add them to round 1 (lowest sort_order)
        if (!wasConfirmed && "CONFIRMED".equals(entity.status)) {
            CompetitionRound round1 = CompetitionRound.<CompetitionRound>list(
                    "compId = ?1 ORDER BY sortOrder ASC", entity.compId)
                    .stream().findFirst().orElse(null);
            if (round1 != null) {
                boolean alreadyIn = RoundParticipant.count(
                        "roundId = ?1 and registrationId = ?2", round1.id, entity.id) > 0;
                if (!alreadyIn) {
                    RoundParticipant rp = new RoundParticipant();
                    rp.roundId = round1.id;
                    rp.registrationId = entity.id;
                    rp.persist();
                }
            }
        }

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
