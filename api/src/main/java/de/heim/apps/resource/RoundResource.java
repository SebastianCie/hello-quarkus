package de.heim.apps.resource;

import de.heim.apps.entity.*;
import de.heim.apps.resource.ScoreboardResource.RankEntry;
import de.heim.apps.service.ScoreboardEvents;
import jakarta.inject.Inject;
import jakarta.persistence.PersistenceException;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.*;
import java.util.stream.Collectors;

@Path("/api/v1/rounds")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class RoundResource {

    @Inject
    ScoreboardEvents scoreboardEvents;

    // ── CRUD ─────────────────────────────────────────────────────────────────────

    @GET
    public List<CompetitionRound> list(@QueryParam("compId") UUID compId) {
        if (compId != null)
            return CompetitionRound.list("compId = ?1 ORDER BY sortOrder ASC", compId);
        return CompetitionRound.listAll();
    }

    @GET
    @Path("/{id}")
    public Response get(@PathParam("id") UUID id) {
        CompetitionRound r = CompetitionRound.findById(id);
        return r != null ? Response.ok(r).build() : Response.status(404).build();
    }

    @POST
    @Transactional
    public Response create(CompetitionRound round) {
        round.id = null;
        if (round.slug == null || round.slug.isBlank()) {
            round.slug = round.name.toLowerCase()
                    .replaceAll("\\s+", "-")
                    .replaceAll("[^a-z0-9-]", "");
        }
        try {
            round.persistAndFlush();
        } catch (PersistenceException e) {
            return roundConflictError(e);
        }
        return Response.status(201).entity(round).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") UUID id, CompetitionRound data) {
        CompetitionRound round = CompetitionRound.findById(id);
        if (round == null) return Response.status(404).build();
        if (data.name != null) round.name = data.name;
        if (data.slug != null) round.slug = data.slug;
        round.sortOrder = data.sortOrder;
        round.startAt = data.startAt;
        round.endAt = data.endAt;
        round.advancementCount = data.advancementCount;
        if (data.status != null) round.status = data.status;
        try {
            CompetitionRound.getEntityManager().flush();
        } catch (PersistenceException e) {
            return roundConflictError(e);
        }
        return Response.ok(round).build();
    }

    private Response roundConflictError(PersistenceException e) {
        String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
        if (msg.contains("uq_round_comp_sort_order")) {
            return Response.status(409)
                    .entity(Map.of("message", "Diese Reihenfolge ist bereits vergeben. Bitte eine andere Nummer wählen."))
                    .build();
        }
        if (msg.contains("comp_id, slug") || msg.contains("competition_round_comp_id_slug")) {
            return Response.status(409)
                    .entity(Map.of("message", "Ein Runden-Slug mit diesem Namen existiert bereits in diesem Wettkampf."))
                    .build();
        }
        throw e;
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        CompetitionRound round = CompetitionRound.findById(id);
        if (round == null) return Response.status(404).build();
        // Block deletion if scores exist for routes in this round
        List<Route> routes = Route.list("roundId", id);
        if (!routes.isEmpty()) {
            List<UUID> routeIds = routes.stream().map(r -> r.id).toList();
            long scoreCount = Score.count("routeId in ?1", routeIds);
            if (scoreCount > 0)
                return Response.status(409)
                        .entity(Map.of("message", "Runde kann nicht gelöscht werden, da bereits Ergebnisse eingetragen wurden."))
                        .build();
        }
        RoundParticipant.delete("roundId", id);
        Route.delete("roundId", id);
        round.delete();
        return Response.noContent().build();
    }

    // ── Participants ──────────────────────────────────────────────────────────────

    @GET
    @Path("/{id}/participants")
    public List<RoundParticipant> participants(@PathParam("id") UUID id) {
        return RoundParticipant.list("roundId", id);
    }

    @POST
    @Path("/{id}/participants")
    @Transactional
    public Response addParticipant(@PathParam("id") UUID id, Map<String, String> body) {
        UUID regId = UUID.fromString(body.get("registrationId"));
        boolean exists = RoundParticipant.count("roundId = ?1 and registrationId = ?2", id, regId) > 0;
        if (exists) return Response.status(409).entity(Map.of("message", "Bereits in dieser Runde.")).build();
        RoundParticipant rp = new RoundParticipant();
        rp.roundId = id;
        rp.registrationId = regId;
        rp.persist();
        return Response.status(201).entity(rp).build();
    }

    @DELETE
    @Path("/{id}/participants/{registrationId}")
    @Transactional
    public Response removeParticipant(@PathParam("id") UUID id, @PathParam("registrationId") UUID regId) {
        long deleted = RoundParticipant.delete("roundId = ?1 and registrationId = ?2", id, regId);
        return deleted > 0 ? Response.noContent().build() : Response.status(404).build();
    }

    // ── Category statuses ─────────────────────────────────────────────────────────

    @GET
    @Path("/{id}/category-statuses")
    public List<RoundCategoryStatus> categoryStatuses(@PathParam("id") UUID id) {
        return RoundCategoryStatus.list("roundId", id);
    }

    @GET
    @Path("/category-statuses")
    public List<RoundCategoryStatus> allCategoryStatuses(@QueryParam("compId") UUID compId) {
        if (compId == null) return List.of();
        List<CompetitionRound> rounds = CompetitionRound.list("compId", compId);
        if (rounds.isEmpty()) return List.of();
        List<UUID> roundIds = rounds.stream().map(r -> r.id).toList();
        return RoundCategoryStatus.list("roundId in ?1", roundIds);
    }

    // ── Advancement preview ───────────────────────────────────────────────────────

    record AdvancementPreview(
            boolean allScoresComplete,
            List<String> missingScoreAthletes,
            List<CategoryAdvancement> categories
    ) {}

    record CategoryAdvancement(
            String categoryId,
            String categoryName,
            boolean alreadyClosed,
            int advancementCount,
            List<AdvancementAthlete> advancing,
            List<AdvancementAthlete> eliminated
    ) {}

    record AdvancementAthlete(
            String registrationId,
            String firstName,
            String lastName,
            String startNumber,
            Integer rank,
            double totalPoints
    ) {}

    @GET
    @Path("/{id}/advancement-preview")
    public Response advancementPreview(@PathParam("id") UUID id,
                                       @QueryParam("categoryId") UUID filterCategoryId) {
        CompetitionRound round = CompetitionRound.findById(id);
        if (round == null) return Response.status(404).build();
        if (round.advancementCount == null)
            return Response.status(400).entity(Map.of("message", "Diese Runde hat keine Weiterkommen-Konfiguration (Finale).")).build();

        Competition comp = Competition.findById(round.compId);
        List<ScoringConfig> configs = ScoringConfig.list("compId = ?1 ORDER BY sortOrder ASC", round.compId);
        List<CompetitionCategory> allCategories = CompetitionCategory.list("compId", round.compId);
        List<CompetitionCategory> categories = filterCategoryId != null
                ? allCategories.stream().filter(c -> c.id.equals(filterCategoryId)).toList()
                : allCategories;

        // Load per-category closed statuses for this round
        Set<UUID> closedCategoryIds = RoundCategoryStatus.<RoundCategoryStatus>list(
                "roundId = ?1 and status = 'CLOSED'", id)
                .stream().map(s -> s.categoryId).collect(Collectors.toSet());

        List<RoundParticipant> participants = RoundParticipant.list("roundId", id);
        List<UUID> regIds = participants.stream().map(p -> p.registrationId).toList();
        if (regIds.isEmpty()) return Response.ok(new AdvancementPreview(true, List.of(), List.of())).build();

        List<Route> roundRoutes = Route.list("roundId", id);
        List<UUID> routeIds = roundRoutes.stream().map(r -> r.id).toList();

        List<Registration> regs = Registration.list("id in ?1", regIds);
        // Filter to chosen category if specified
        if (filterCategoryId != null) {
            final UUID fid = filterCategoryId;
            regs = regs.stream().filter(r -> fid.equals(r.categoryId)).toList();
        }

        Map<UUID, Athlete> athleteMap = regs.isEmpty() ? Map.of()
                : Athlete.<Athlete>list("id in ?1", regs.stream().map(r -> r.athleteId).distinct().toList())
                        .stream().collect(Collectors.toMap(a -> a.id, a -> a));

        final List<Registration> finalRegs = regs;
        Map<UUID, List<Score>> scoresByReg = routeIds.isEmpty() || regs.isEmpty() ? Map.of()
                : Score.<Score>list("registrationId in ?1 and routeId in ?2",
                        finalRegs.stream().map(r -> r.id).toList(), routeIds)
                        .stream().collect(Collectors.groupingBy(s -> s.registrationId));

        // Check completeness (only for non-closed categories)
        List<String> missing = new ArrayList<>();
        for (Registration reg : regs) {
            if (reg.categoryId != null && closedCategoryIds.contains(reg.categoryId)) continue;
            List<Score> regScores = scoresByReg.getOrDefault(reg.id, List.of());
            long withAttempts = regScores.stream().filter(s -> s.attempts > 0).count();
            if (withAttempts < roundRoutes.size()) {
                Athlete ath = athleteMap.get(reg.athleteId);
                if (ath != null) missing.add(ath.firstName + " " + ath.lastName);
            }
        }

        List<CategoryAdvancement> catResults = new ArrayList<>();

        if (comp.genderBasedCategories) {
            // Group by athlete gender (same logic as ScoreboardResource)
            Map<String, List<Registration>> byGender = new LinkedHashMap<>();
            byGender.put("FEMALE", new ArrayList<>());
            byGender.put("MALE", new ArrayList<>());
            for (Registration r : regs) {
                Athlete ath = athleteMap.get(r.athleteId);
                if (ath == null) continue;
                String g = ath.gender != null ? ath.gender.toUpperCase() : null;
                if ("FEMALE".equals(g)) byGender.get("FEMALE").add(r);
                else if ("MALE".equals(g)) byGender.get("MALE").add(r);
            }
            Map<String, String> genderLabel = Map.of("FEMALE", "Frauen", "MALE", "Männer");
            for (Map.Entry<String, List<Registration>> entry : byGender.entrySet()) {
                if (entry.getValue().isEmpty()) continue;
                catResults.add(buildCategoryAdvancement(
                        entry.getKey(), genderLabel.get(entry.getKey()), false, round.advancementCount,
                        entry.getValue(), athleteMap, scoresByReg, configs, comp, round));
            }
        } else {
            Map<UUID, List<Registration>> byCat = regs.stream()
                    .filter(r -> r.categoryId != null)
                    .collect(Collectors.groupingBy(r -> r.categoryId));
            List<Registration> noCat = filterCategoryId == null
                    ? regs.stream().filter(r -> r.categoryId == null).toList()
                    : List.of();

            for (CompetitionCategory cat : categories) {
                List<Registration> catRegs = byCat.getOrDefault(cat.id, List.of());
                if (catRegs.isEmpty()) continue;
                boolean closed = closedCategoryIds.contains(cat.id);
                catResults.add(buildCategoryAdvancement(
                        cat.id.toString(), cat.name, closed, round.advancementCount,
                        catRegs, athleteMap, scoresByReg, configs, comp, round));
            }
            if (!noCat.isEmpty()) {
                catResults.add(buildCategoryAdvancement(
                        null, "Ohne Kategorie", false, round.advancementCount,
                        noCat, athleteMap, scoresByReg, configs, comp, round));
            }
        }

        return Response.ok(new AdvancementPreview(missing.isEmpty(), missing, catResults)).build();
    }

    private CategoryAdvancement buildCategoryAdvancement(
            String catId, String catName, boolean alreadyClosed, int advCount,
            List<Registration> regs, Map<UUID, Athlete> athleteMap,
            Map<UUID, List<Score>> scoresByReg, List<ScoringConfig> configs,
            Competition comp, CompetitionRound round) {

        List<RankEntry> ranked = ScoreboardResource.rankAthletes(regs, athleteMap, scoresByReg, configs, comp, round);

        List<AdvancementAthlete> advancing = new ArrayList<>();
        List<AdvancementAthlete> eliminated = new ArrayList<>();

        for (RankEntry e : ranked) {
            AdvancementAthlete aa = new AdvancementAthlete(
                    e.registrationId(), e.firstName(), e.lastName(), e.startNumber(), e.rank(), e.totalPoints());
            if (e.rank() != null && e.rank() <= advCount) advancing.add(aa);
            else eliminated.add(aa);
        }
        return new CategoryAdvancement(catId, catName, alreadyClosed, advCount, advancing, eliminated);
    }

    // ── Close round ───────────────────────────────────────────────────────────────

    record CloseRequest(String categoryId, List<String> advancedRegistrationIds) {}

    @POST
    @Path("/{id}/close")
    @Transactional
    public Response closeRound(@PathParam("id") UUID id, CloseRequest req) {
        CompetitionRound round = CompetitionRound.findById(id);
        if (round == null) return Response.status(404).build();
        if ("CLOSED".equals(round.status))
            return Response.status(409).entity(Map.of("message", "Runde ist bereits abgeschlossen.")).build();

        // Gender-based categories use "FEMALE"/"MALE" as ids — these are not real UUIDs.
        // Treat them as close-all (null) since per-gender status tracking is not needed.
        UUID categoryId = null;
        if (req != null && req.categoryId() != null) {
            try { categoryId = UUID.fromString(req.categoryId()); } catch (IllegalArgumentException ignored) {}
        }

        if (categoryId != null) {
            // ── Close only this category ──────────────────────────────────────────
            RoundCategoryStatus catStatus = RoundCategoryStatus.<RoundCategoryStatus>find(
                    "roundId = ?1 and categoryId = ?2", id, categoryId).firstResult();
            if (catStatus != null && "CLOSED".equals(catStatus.status))
                return Response.status(409)
                        .entity(Map.of("message", "Diese Kategorie ist in dieser Runde bereits abgeschlossen."))
                        .build();
            if (catStatus == null) {
                catStatus = new RoundCategoryStatus();
                catStatus.roundId = id;
                catStatus.categoryId = categoryId;
            }
            catStatus.status = "CLOSED";
            catStatus.persist();

            // Auto-close whole round when all categories with participants are closed
            List<CompetitionCategory> allCats = CompetitionCategory.list("compId", round.compId);
            // Only count categories that actually have participants in this round
            List<RoundParticipant> participants = RoundParticipant.list("roundId", id);
            List<UUID> regIds = participants.stream().map(p -> p.registrationId).toList();
            Set<UUID> participatingCatIds = regIds.isEmpty() ? Set.of()
                    : Registration.<Registration>list("id in ?1", regIds).stream()
                            .filter(r -> r.categoryId != null)
                            .map(r -> r.categoryId).collect(Collectors.toSet());

            long closedCount = RoundCategoryStatus.count("roundId = ?1 and status = 'CLOSED'", id);
            if (!participatingCatIds.isEmpty() && closedCount >= participatingCatIds.size()) {
                round.status = "CLOSED";
            }
        } else {
            // ── Close entire round ────────────────────────────────────────────────
            round.status = "CLOSED";
        }

        // Advance athletes to next round
        List<CompetitionRound> allRounds = CompetitionRound.list(
                "compId = ?1 ORDER BY sortOrder ASC", round.compId);
        CompetitionRound nextRound = allRounds.stream()
                .filter(r -> r.sortOrder > round.sortOrder)
                .findFirst().orElse(null);

        if (nextRound != null && req != null && req.advancedRegistrationIds() != null
                && !req.advancedRegistrationIds().isEmpty()) {
            if (!"ACTIVE".equals(nextRound.status)) nextRound.status = "ACTIVE";
            for (String regIdStr : req.advancedRegistrationIds()) {
                UUID regId = UUID.fromString(regIdStr);
                boolean exists = RoundParticipant.count(
                        "roundId = ?1 and registrationId = ?2", nextRound.id, regId) > 0;
                if (!exists) {
                    RoundParticipant rp = new RoundParticipant();
                    rp.roundId = nextRound.id;
                    rp.registrationId = regId;
                    rp.persist();
                }
            }
        }

        scoreboardEvents.emit(round.compId.toString());
        return Response.ok(Map.of("closed", round, "nextRound", nextRound != null ? nextRound : Map.of())).build();
    }
}
