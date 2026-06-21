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

    // ── DTOs ──────────────────────────────────────────────────────────────────

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
    record ScoreboardData(CompetitionDto competition, List<ScoringConfigDto> scoringConfig, List<CategoryBoard> categories) {}
    record CompetitionDto(String id, String name, String slug, String discipline, String status) {}
    record ScoringConfigDto(String eventType, double points, String label) {}

    // ── Scoring ───────────────────────────────────────────────────────────────

    private double calcPoints(List<Score> scores, List<ScoringConfig> configs) {
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
                        if (s.zoned) total += cfg.points.doubleValue();
                        break;
                    case "ATTEMPT_DEDUCTION":
                        total += cfg.points.doubleValue() * s.attempts;
                        break;
                    default: break;
                }
            }
        }
        return total;
    }

    private List<AthleteEntry> buildAndRank(
            List<Registration> regs,
            Map<UUID, Athlete> athleteMap,
            Map<UUID, List<Score>> scoresByReg,
            List<ScoringConfig> configs
    ) {
        List<AthleteEntry> withScores = new ArrayList<>();
        List<AthleteEntry> withoutScores = new ArrayList<>();

        for (Registration reg : regs) {
            Athlete ath = athleteMap.get(reg.athleteId);
            if (ath == null) continue;
            List<Score> regScores = scoresByReg.getOrDefault(reg.id, List.of());

            double pts = calcPoints(regScores, configs);
            int topped = (int) regScores.stream().filter(s -> s.topped && s.attempts > 0).count();
            int zoned  = (int) regScores.stream().filter(s -> s.zoned && !s.topped && s.attempts > 0).count();

            List<ScoreDto> scoreDtos = regScores.stream()
                    .map(s -> new ScoreDto(s.routeId.toString(), s.topped, s.zoned, s.attempts))
                    .toList();

            AthleteEntry entry = new AthleteEntry(
                    null,
                    new RegistrationDto(reg.id.toString(), reg.startNumber),
                    new AthleteDto(ath.firstName, ath.lastName),
                    pts, topped, zoned, scoreDtos
            );

            if (regScores.isEmpty()) withoutScores.add(entry);
            else withScores.add(entry);
        }

        // Sort by points desc
        withScores.sort((a, b) -> Double.compare(b.totalPoints(), a.totalPoints()));

        // Assign ranks with ties (1,2,3,3,5)
        List<AthleteEntry> ranked = new ArrayList<>();
        int rank = 1;
        for (int i = 0; i < withScores.size(); i++) {
            if (i > 0 && withScores.get(i).totalPoints() < withScores.get(i - 1).totalPoints()) {
                rank = i + 1;
            }
            AthleteEntry e = withScores.get(i);
            ranked.add(new AthleteEntry(rank, e.registration(), e.athlete(), e.totalPoints(), e.toppedCount(), e.zonedCount(), e.scores()));
        }
        ranked.addAll(withoutScores);
        return ranked;
    }

    // ── Endpoints ─────────────────────────────────────────────────────────────

    @GET
    @Path("/{slug}")
    public Response get(@PathParam("slug") String slug) {
        Competition comp = Competition.find("slug", slug).firstResult();
        if (comp == null) return Response.status(404).build();

        List<ScoringConfig> configs = ScoringConfig.list("compId = ?1 ORDER BY sortOrder ASC", comp.id);
        List<CompetitionCategory> categories = CompetitionCategory.list("compId", comp.id);
        List<Registration> regs = Registration.find("compId = ?1 and status = 'CONFIRMED'", comp.id).list();

        // Load athletes
        List<UUID> athleteIds = regs.stream().map(r -> r.athleteId).distinct().toList();
        Map<UUID, Athlete> athleteMap = athleteIds.isEmpty() ? Map.of()
                : Athlete.<Athlete>list("id in ?1", athleteIds).stream()
                        .collect(Collectors.toMap(a -> a.id, a -> a));

        // Load scores
        List<UUID> regIds = regs.stream().map(r -> r.id).toList();
        Map<UUID, List<Score>> scoresByReg = regIds.isEmpty() ? Map.of()
                : Score.<Score>list("registrationId in ?1", regIds).stream()
                        .collect(Collectors.groupingBy(s -> s.registrationId));

        // Group registrations by categoryId
        Map<UUID, List<Registration>> regsByCategory = regs.stream()
                .filter(r -> r.categoryId != null)
                .collect(Collectors.groupingBy(r -> r.categoryId));
        List<Registration> noCatRegs = regs.stream().filter(r -> r.categoryId == null).toList();

        List<ScoringConfigDto> configDtos = configs.stream()
                .map(c -> new ScoringConfigDto(c.eventType, c.points.doubleValue(), c.label))
                .toList();

        // Build category boards in defined order
        List<CategoryBoard> boards = new ArrayList<>();
        for (CompetitionCategory cat : categories) {
            List<Registration> catRegs = regsByCategory.getOrDefault(cat.id, List.of());
            if (catRegs.isEmpty()) continue;
            boards.add(new CategoryBoard(
                    new CategoryDto(cat.id.toString(), cat.name),
                    buildAndRank(catRegs, athleteMap, scoresByReg, configs)
            ));
        }
        if (!noCatRegs.isEmpty()) {
            boards.add(new CategoryBoard(
                    new CategoryDto("", "Ohne Kategorie"),
                    buildAndRank(noCatRegs, athleteMap, scoresByReg, configs)
            ));
        }

        ScoreboardData data = new ScoreboardData(
                new CompetitionDto(comp.id.toString(), comp.name, comp.slug, comp.discipline, comp.status),
                configDtos,
                boards
        );
        return Response.ok(data).build();
    }

    @GET
    @Path("/{slug}/stream")
    @Produces(MediaType.SERVER_SENT_EVENTS)
    @RestSseElementType(MediaType.TEXT_PLAIN)
    @Blocking
    public Multi<String> stream(@PathParam("slug") String slug) {
        Competition comp = Competition.find("slug", slug).firstResult();
        if (comp == null) return Multi.createFrom().empty();
        // Merge live events with a heartbeat every 20s to keep connections alive through proxies
        return Multi.createBy().merging().streams(
                events.stream(comp.id.toString()),
                Multi.createFrom().ticks().every(Duration.ofSeconds(20)).map(t -> "heartbeat")
        );
    }
}
