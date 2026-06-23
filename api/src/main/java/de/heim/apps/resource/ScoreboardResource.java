package de.heim.apps.resource;

import de.heim.apps.entity.*;
import de.heim.apps.service.ScoreboardEvents;
import io.smallrye.common.annotation.Blocking;
import io.smallrye.mutiny.Multi;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.RestSseElementType;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Path("/api/v1/scoreboard")
@Produces(MediaType.APPLICATION_JSON)
public class ScoreboardResource {

    @Inject
    ScoreboardEvents events;

    // ── Public DTOs (used by RoundResource too) ───────────────────────────────

    public record RankEntry(
            String registrationId, String startNumber,
            String firstName, String lastName,
            Integer rank, double totalPoints,
            int toppedCount, int zonedCount
    ) {}

    // ── Internal DTOs ─────────────────────────────────────────────────────────

    record AthleteEntry(
            Integer rank,
            RegistrationDto registration,
            AthleteDto athlete,
            double totalPoints,
            int toppedCount,
            int zonedCount,
            List<ScoreDto> scores
    ) {}

    record RegistrationDto(String id, String startNumber) {}
    record AthleteDto(String firstName, String lastName) {}
    record ScoreDto(String routeId, boolean topped, boolean zoned, int attempts) {}
    record CategoryBoard(CategoryDto category, List<AthleteEntry> athletes) {}
    record CategoryDto(String id, String name) {}
    record RoundDto(String id, String name, String slug, String status, int sortOrder) {}
    record ScoreboardData(
            CompetitionDto competition,
            RoundDto round,
            List<RoundDto> allRounds,
            List<ScoringConfigDto> scoringConfig,
            List<CategoryBoard> categories
    ) {}
    record CompetitionDto(String id, String name, String slug, String discipline, String status) {}
    record ScoringConfigDto(String eventType, double points, String label) {}

    // ── Scoring ───────────────────────────────────────────────────────────────

    static double calcPoints(List<Score> scores, List<ScoringConfig> configs) {
        if (configs.isEmpty()) return 0;
        boolean hasFlash = configs.stream().anyMatch(c -> "FLASH".equals(c.eventType));
        double total = 0;
        for (Score s : scores) {
            for (ScoringConfig cfg : configs) {
                if (s.attempts == 0) continue;
                switch (cfg.eventType) {
                    case "FLASH":
                        if (s.topped && s.attempts == 1) total += cfg.points.doubleValue();
                        break;
                    case "TOP":
                        if (s.topped && (!hasFlash || s.attempts > 1)) total += cfg.points.doubleValue();
                        break;
                    case "ZONE":
                    case "ZONE_1":
                    case "ZONE_2":
                        if (s.zoned && !s.topped) total += cfg.points.doubleValue();
                        break;
                    case "ATTEMPT_DEDUCTION":
                        // Deduct only for unsuccessful attempts (successful attempt is excluded)
                        if (s.topped || s.zoned) {
                            total += cfg.points.doubleValue() * (s.attempts - 1);
                        }
                        break;
                    default: break;
                }
            }
        }
        return total;
    }

    // ── Shared ranking logic (also used by RoundResource) ────────────────────

    public static List<RankEntry> rankAthletes(
            List<Registration> regs,
            Map<UUID, Athlete> athleteMap,
            Map<UUID, List<Score>> scoresByReg,
            List<ScoringConfig> configs,
            Competition comp,
            CompetitionRound round   // null if no tiebreak needed
    ) {
        List<RankEntry> withScores = new ArrayList<>();
        List<RankEntry> withoutScores = new ArrayList<>();

        for (Registration reg : regs) {
            Athlete ath = athleteMap.get(reg.athleteId);
            if (ath == null) continue;
            List<Score> regScores = scoresByReg.getOrDefault(reg.id, List.of());
            double pts = calcPoints(regScores, configs);
            int topped = (int) regScores.stream().filter(s -> s.topped && s.attempts > 0).count();
            int zoned  = (int) regScores.stream().filter(s -> s.zoned && !s.topped && s.attempts > 0).count();

            RankEntry e = new RankEntry(reg.id.toString(), reg.startNumber,
                    ath.firstName, ath.lastName, null, pts, topped, zoned);
            if (regScores.stream().anyMatch(s -> s.attempts > 0)) withScores.add(e);
            else withoutScores.add(e);
        }

        // Sort: primary = points desc; tiebreak = previous round rank if configured
        Map<String, Integer> prevRanks = (comp != null && comp.tiebreakUsePreviousRound && round != null)
                ? loadPreviousRoundRanks(round, configs)
                : Map.of();

        withScores.sort((a, b) -> {
            int cmp = Double.compare(b.totalPoints(), a.totalPoints());
            if (cmp != 0) return cmp;
            if (!prevRanks.isEmpty()) {
                int ra = prevRanks.getOrDefault(a.registrationId(), Integer.MAX_VALUE);
                int rb = prevRanks.getOrDefault(b.registrationId(), Integer.MAX_VALUE);
                return Integer.compare(ra, rb);
            }
            return 0;
        });

        List<RankEntry> ranked = new ArrayList<>();
        int rank = 1;
        for (int i = 0; i < withScores.size(); i++) {
            if (i > 0) {
                RankEntry prev = withScores.get(i - 1);
                RankEntry curr = withScores.get(i);
                boolean samePoints = Double.compare(curr.totalPoints(), prev.totalPoints()) == 0;
                boolean samePrevRank = prevRanks.isEmpty() ||
                        prevRanks.getOrDefault(curr.registrationId(), Integer.MAX_VALUE)
                        .equals(prevRanks.getOrDefault(prev.registrationId(), Integer.MAX_VALUE));
                if (!samePoints || !samePrevRank) rank = i + 1;
            }
            RankEntry e = withScores.get(i);
            ranked.add(new RankEntry(e.registrationId(), e.startNumber(), e.firstName(), e.lastName(),
                    rank, e.totalPoints(), e.toppedCount(), e.zonedCount()));
        }
        ranked.addAll(withoutScores);
        return ranked;
    }

    private static Map<String, Integer> loadPreviousRoundRanks(CompetitionRound round, List<ScoringConfig> configs) {
        // Find the round directly before this one
        List<CompetitionRound> prev = CompetitionRound.list(
                "compId = ?1 and sortOrder < ?2 and status = 'CLOSED' ORDER BY sortOrder DESC",
                round.compId, round.sortOrder);
        if (prev.isEmpty()) return Map.of();
        CompetitionRound prevRound = prev.get(0);

        List<RoundParticipant> participants = RoundParticipant.list("roundId", prevRound.id);
        List<UUID> regIds = participants.stream().map(p -> p.registrationId).toList();
        if (regIds.isEmpty()) return Map.of();

        List<Route> prevRoutes = Route.list("roundId", prevRound.id);
        List<UUID> routeIds = prevRoutes.stream().map(r -> r.id).toList();
        Map<UUID, List<Score>> scoresByReg = routeIds.isEmpty() ? Map.of()
                : Score.<Score>list("registrationId in ?1 and routeId in ?2", regIds, routeIds)
                        .stream().collect(Collectors.groupingBy(s -> s.registrationId));

        List<Registration> regs = Registration.list("id in ?1", regIds);
        Map<UUID, Athlete> athleteMap = Athlete.<Athlete>list(
                "id in ?1", regs.stream().map(r -> r.athleteId).distinct().toList()
        ).stream().collect(Collectors.toMap(a -> a.id, a -> a));

        // Rank without tiebreak recursion
        List<RankEntry> prevRanked = rankAthletes(regs, athleteMap, scoresByReg, configs, null, null);
        Map<String, Integer> rankMap = new HashMap<>();
        for (RankEntry e : prevRanked) {
            if (e.rank() != null) rankMap.put(e.registrationId(), e.rank());
        }
        return rankMap;
    }

    // ── Build scoreboard ──────────────────────────────────────────────────────

    private List<AthleteEntry> buildAndRank(
            List<Registration> regs, Map<UUID, Athlete> athleteMap,
            Map<UUID, List<Score>> scoresByReg, List<ScoringConfig> configs,
            Competition comp, CompetitionRound round) {

        List<RankEntry> ranked = rankAthletes(regs, athleteMap, scoresByReg, configs, comp, round);
        return ranked.stream().map(e -> {
            List<Score> regScores = scoresByReg.getOrDefault(UUID.fromString(e.registrationId()), List.of());
            List<ScoreDto> dtos = regScores.stream()
                    .map(s -> new ScoreDto(s.routeId.toString(), s.topped, s.zoned, s.attempts)).toList();
            return new AthleteEntry(e.rank(),
                    new RegistrationDto(e.registrationId(), e.startNumber()),
                    new AthleteDto(e.firstName(), e.lastName()),
                    e.totalPoints(), e.toppedCount(), e.zonedCount(), dtos);
        }).toList();
    }

    private Response buildScoreboard(Competition comp, CompetitionRound round, List<CompetitionRound> allRounds) {
        List<ScoringConfig> configs = ScoringConfig.list("compId = ?1 ORDER BY sortOrder ASC", comp.id);
        List<CompetitionCategory> categories = CompetitionCategory.list("compId", comp.id);

        // Participants in this round
        List<RoundParticipant> participants = RoundParticipant.list("roundId", round.id);
        List<UUID> regIds = participants.stream().map(p -> p.registrationId).toList();

        // Routes in this round
        List<Route> roundRoutes = Route.list("roundId", round.id);
        List<UUID> routeIds = roundRoutes.stream().map(r -> r.id).toList();

        List<Registration> regs = regIds.isEmpty() ? List.of()
                : Registration.list("id in ?1", regIds);

        Map<UUID, Athlete> athleteMap = regs.isEmpty() ? Map.of()
                : Athlete.<Athlete>list("id in ?1", regs.stream().map(r -> r.athleteId).distinct().toList())
                        .stream().collect(Collectors.toMap(a -> a.id, a -> a));

        Map<UUID, List<Score>> scoresByReg = (regIds.isEmpty() || routeIds.isEmpty()) ? Map.of()
                : Score.<Score>list("registrationId in ?1 and routeId in ?2", regIds, routeIds)
                        .stream().collect(Collectors.groupingBy(s -> s.registrationId));

        List<ScoringConfigDto> configDtos = configs.stream()
                .map(c -> new ScoringConfigDto(c.eventType, c.points.doubleValue(), c.label)).toList();

        List<CategoryBoard> boards = new ArrayList<>();

        if (comp.genderBasedCategories) {
            Map<String, List<Registration>> byGender = new LinkedHashMap<>();
            byGender.put("FEMALE", new ArrayList<>());
            byGender.put("MALE", new ArrayList<>());
            for (Registration r : regs) {
                Athlete ath = athleteMap.get(r.athleteId);
                if (ath == null) continue;
                String g = ath.gender != null ? ath.gender.toUpperCase() : null;
                if ("FEMALE".equals(g) || "MALE".equals(g)) {
                    byGender.get(g).add(r);
                }
            }
            Map<String, String> genderLabel = Map.of("FEMALE", "Frauen", "MALE", "Männer");
            for (Map.Entry<String, List<Registration>> entry : byGender.entrySet()) {
                if (entry.getValue().isEmpty()) continue;
                boards.add(new CategoryBoard(
                        new CategoryDto(entry.getKey(), genderLabel.get(entry.getKey())),
                        buildAndRank(entry.getValue(), athleteMap, scoresByReg, configs, comp, round)));
            }
        } else {
            Map<UUID, List<Registration>> regsByCategory = regs.stream()
                    .filter(r -> r.categoryId != null)
                    .collect(Collectors.groupingBy(r -> r.categoryId));
            List<Registration> noCatRegs = regs.stream().filter(r -> r.categoryId == null).toList();

            for (CompetitionCategory cat : categories) {
                List<Registration> catRegs = regsByCategory.getOrDefault(cat.id, List.of());
                if (catRegs.isEmpty()) continue;
                boards.add(new CategoryBoard(
                        new CategoryDto(cat.id.toString(), cat.name),
                        buildAndRank(catRegs, athleteMap, scoresByReg, configs, comp, round)));
            }
            if (!noCatRegs.isEmpty()) {
                boards.add(new CategoryBoard(
                        new CategoryDto("", "Ohne Kategorie"),
                        buildAndRank(noCatRegs, athleteMap, scoresByReg, configs, comp, round)));
            }
        }

        List<RoundDto> roundDtos = allRounds.stream()
                .map(r -> new RoundDto(r.id.toString(), r.name, r.slug, r.status, r.sortOrder)).toList();

        ScoreboardData data = new ScoreboardData(
                new CompetitionDto(comp.id.toString(), comp.name, comp.slug, comp.discipline, comp.status),
                new RoundDto(round.id.toString(), round.name, round.slug, round.status, round.sortOrder),
                roundDtos,
                configDtos,
                boards
        );
        return Response.ok(data).build();
    }

    // ── Endpoints ─────────────────────────────────────────────────────────────

    /** Current active round */
    @GET
    @Path("/{slug}")
    public Response get(@PathParam("slug") String slug) {
        Competition comp = Competition.find("slug", slug).firstResult();
        if (comp == null) return Response.status(404).build();
        List<CompetitionRound> rounds = CompetitionRound.list("compId = ?1 ORDER BY sortOrder ASC", comp.id);
        if (rounds.isEmpty()) return Response.status(404).entity(Map.of("message", "Keine Runden konfiguriert.")).build();
        CompetitionRound active = rounds.stream().filter(r -> "ACTIVE".equals(r.status)).findFirst()
                .orElse(rounds.get(rounds.size() - 1)); // fallback: last round
        return buildScoreboard(comp, active, rounds);
    }

    /** Specific round by slug */
    @GET
    @Path("/{slug}/{roundSlug}")
    public Response getByRound(@PathParam("slug") String slug, @PathParam("roundSlug") String roundSlug) {
        Competition comp = Competition.find("slug", slug).firstResult();
        if (comp == null) return Response.status(404).build();
        List<CompetitionRound> rounds = CompetitionRound.list("compId = ?1 ORDER BY sortOrder ASC", comp.id);
        CompetitionRound round = rounds.stream().filter(r -> roundSlug.equals(r.slug)).findFirst().orElse(null);
        if (round == null) return Response.status(404).build();
        return buildScoreboard(comp, round, rounds);
    }

    /** SSE stream — fires on any score change for the competition */
    @GET
    @Path("/{slug}/stream")
    @Produces(MediaType.SERVER_SENT_EVENTS)
    @RestSseElementType(MediaType.TEXT_PLAIN)
    @Blocking
    public Multi<String> stream(@PathParam("slug") String slug) {
        Competition comp = Competition.find("slug", slug).firstResult();
        if (comp == null) return Multi.createFrom().empty();
        return Multi.createBy().merging().streams(
                events.stream(comp.id.toString()),
                Multi.createFrom().ticks().every(Duration.ofSeconds(20)).map(t -> "heartbeat")
        );
    }
}
