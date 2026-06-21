package de.heim.apps.resource;

import de.heim.apps.entity.Athlete;
import de.heim.apps.entity.Competition;
import de.heim.apps.entity.CompetitionCategory;
import de.heim.apps.entity.CompetitionRound;
import de.heim.apps.entity.Registration;
import de.heim.apps.entity.RoundCategoryStatus;
import de.heim.apps.entity.RoundParticipant;
import de.heim.apps.entity.Score;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.*;
import java.util.stream.Collectors;

@Path("/api/v1/athletes")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AthleteResource {

    @Inject
    SecurityIdentity identity;

    @GET
    @Path("/me")
    public Response me() {
        if (identity.isAnonymous()) {
            return Response.status(401).entity(Map.of("message", "Nicht eingeloggt")).build();
        }
        UUID userId = UUID.fromString(identity.getPrincipal().getName());
        Athlete athlete = Athlete.find("userId", userId).firstResult();
        if (athlete == null) {
            return Response.status(404).entity(Map.of("message", "Kein Athletenprofil gefunden")).build();
        }
        List<Registration> regs = Registration.list("athleteId", athlete.id);
        List<Map<String, Object>> activeRegistrations = regs.stream()
            .map(reg -> {
                Competition comp = Competition.findById(reg.compId);
                if (comp == null || !"ACTIVE".equals(comp.status)) return null;
                CompetitionCategory cat = reg.categoryId != null
                    ? CompetitionCategory.findById(reg.categoryId) : null;

                // Find the active round this athlete participates in (respecting per-category status)
                CompetitionRound currentRound = null;
                List<RoundParticipant> myParticipations = RoundParticipant.list("registrationId", reg.id);
                if (!myParticipations.isEmpty()) {
                    Set<UUID> myRoundIds = myParticipations.stream()
                            .map(p -> p.roundId).collect(java.util.stream.Collectors.toSet());
                    List<CompetitionRound> rounds = CompetitionRound.list(
                            "compId = ?1 ORDER BY sortOrder ASC", reg.compId);
                    for (CompetitionRound r : rounds) {
                        if (!myRoundIds.contains(r.id)) continue;
                        if ("CLOSED".equals(r.status)) continue;
                        // Check per-category status: if athlete's category is closed in this round, skip
                        if (reg.categoryId != null) {
                            RoundCategoryStatus catStatus = RoundCategoryStatus.find(
                                    "roundId = ?1 and categoryId = ?2", r.id, reg.categoryId).firstResult();
                            if (catStatus != null && "CLOSED".equals(catStatus.status)) continue;
                        }
                        currentRound = r;
                        break;
                    }
                }

                Map<String, Object> entry = new HashMap<>();
                entry.put("registration", reg);
                entry.put("competition", comp);
                entry.put("category", cat);
                if (currentRound != null) entry.put("currentRound", currentRound);
                return entry;
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
        return Response.ok(Map.of("athlete", athlete, "registrations", activeRegistrations)).build();
    }

    @GET
    public List<Athlete> list(@QueryParam("orgId") UUID orgId) {
        if (orgId != null) return Athlete.list("orgId", orgId);
        return Athlete.listAll();
    }

    @GET
    @Path("/{id}")
    public Response get(@PathParam("id") UUID id) {
        Athlete entity = Athlete.findById(id);
        return entity != null ? Response.ok(entity).build() : Response.status(404).build();
    }

    @POST
    @Transactional
    public Response create(Athlete entity) {
        entity.id = null;
        entity.persist();
        return Response.status(201).entity(entity).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") UUID id, Athlete data) {
        Athlete entity = Athlete.findById(id);
        if (entity == null) return Response.status(404).build();
        entity.orgId = data.orgId;
        entity.firstName = data.firstName;
        entity.lastName = data.lastName;
        entity.dateOfBirth = data.dateOfBirth;
        entity.gender = data.gender;
        entity.club = data.club;
        entity.nation = data.nation;
        entity.licenseNumber = data.licenseNumber;
        return Response.ok(entity).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        Athlete athlete = Athlete.findById(id);
        if (athlete == null) return Response.status(404).build();

        List<Registration> regs = Registration.list("athleteId", id);
        List<UUID> regIds = regs.stream().map(r -> r.id).toList();

        long scoreCount = regIds.isEmpty() ? 0
                : Score.count("registrationId in ?1", regIds);
        if (scoreCount > 0) {
            return Response.status(409)
                    .entity(Map.of("message", "Athlet kann nicht gelöscht werden, da bereits Ergebnisse eingetragen wurden."))
                    .build();
        }

        if (!regIds.isEmpty()) {
            Registration.delete("athleteId", id);
        }
        athlete.delete();
        return Response.noContent().build();
    }
}
