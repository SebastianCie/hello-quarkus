package de.heim.apps.resource;

import de.heim.apps.entity.Athlete;
import de.heim.apps.entity.Competition;
import de.heim.apps.entity.CompetitionCategory;
import de.heim.apps.entity.Registration;
import de.heim.apps.entity.User;
import de.heim.apps.service.PasswordService;
import io.quarkus.security.identity.SecurityIdentity;
import org.eclipse.microprofile.jwt.JsonWebToken;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import java.io.IOException;
import java.nio.file.Files;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/api/v1/competitions")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CompetitionResource {

    private static final String TOKEN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RNG = new SecureRandom();

    @Inject
    SecurityIdentity identity;

    @Inject
    JsonWebToken jwt;

    @Inject
    PasswordService passwordService;

    record SelfRegisterRequest(
        String firstName, String lastName, String dateOfBirth,
        String gender, String club, String nation, String licenseNumber,
        UUID categoryId,
        String email, String password
    ) {}

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

    private Response checkRegistrationOpen(Competition comp) {
        if (!comp.selfRegistration) return Response.status(403)
            .entity(Map.of("message", "Für diesen Wettkampf ist keine Selbstregistrierung aktiviert.")).build();
        OffsetDateTime now = OffsetDateTime.now();
        if (comp.registrationOpensAt != null && now.isBefore(comp.registrationOpensAt)) return Response.status(403)
            .entity(Map.of("message", "Die Anmeldung hat noch nicht begonnen.")).build();
        if (comp.registrationClosesAt != null && now.isAfter(comp.registrationClosesAt)) return Response.status(403)
            .entity(Map.of("message", "Die Anmeldephase ist bereits beendet.")).build();
        return null;
    }

    @GET
    @Path("/by-token/{token}")
    public Response byToken(@PathParam("token") String token) {
        Competition comp = Competition.find("registrationToken", token).firstResult();
        if (comp == null) return Response.status(404)
            .entity(Map.of("message", "Ungültiger Registrierungslink.")).build();
        if (!comp.selfRegistration) return Response.status(403)
            .entity(Map.of("message", "Für diesen Wettkampf ist keine Selbstregistrierung aktiviert.")).build();
        List<CompetitionCategory> categories = CompetitionCategory.list("compId", comp.id);
        return Response.ok(Map.of("competition", comp, "categories", categories)).build();
    }

    @GET
    @Path("/by-token/{token}/me")
    @Transactional
    public Response myRegistration(@PathParam("token") String token) {
        if (identity.isAnonymous()) return Response.ok(Map.of("athlete", Map.of(), "registration", Map.of())).build();
        Competition comp = Competition.find("registrationToken", token).firstResult();
        if (comp == null) return Response.status(404).build();
        UUID userId = UUID.fromString(identity.getPrincipal().getName());

        // Primary: find athlete by Keycloak userId
        Athlete athlete = Athlete.find("userId", userId).firstResult();
        Registration reg = null;

        if (athlete != null) {
            List<Registration> regs = Registration.list("compId = ?1 and athleteId = ?2", comp.id, athlete.id);
            reg = regs.isEmpty() ? null : regs.get(0);
        } else {
            // Fallback: match by name among registrations for this competition.
            // Covers athletes created by an admin (userId = null).
            String givenName = jwt.getClaim("given_name");
            String familyName = jwt.getClaim("family_name");
            if (givenName != null && familyName != null) {
                List<Registration> compRegs = Registration.list("compId", comp.id);
                for (Registration r : compRegs) {
                    Athlete candidate = Athlete.findById(r.athleteId);
                    if (candidate != null && candidate.userId == null
                            && givenName.equalsIgnoreCase(candidate.firstName)
                            && familyName.equalsIgnoreCase(candidate.lastName)) {
                        // Link this athlete to the Keycloak user for future lookups
                        candidate.userId = userId;
                        athlete = candidate;
                        reg = r;
                        break;
                    }
                }
            }
        }

        if (athlete == null) {
            return Response.ok(Map.of("athlete", Map.of(), "registration", Map.of())).build();
        }
        Map<String, Object> result = new HashMap<>();
        result.put("athlete", athlete);
        result.put("registration", reg != null ? reg : Map.of());
        return Response.ok(result).build();
    }

    @POST
    @Path("/by-token/{token}/register")
    @Transactional
    public Response selfRegister(@PathParam("token") String token, SelfRegisterRequest req) {
        Competition comp = Competition.find("registrationToken", token).firstResult();
        if (comp == null) return Response.status(404)
            .entity(Map.of("message", "Ungültiger Registrierungslink.")).build();
        Response err = checkRegistrationOpen(comp);
        if (err != null) return err;

        if (comp.genderBasedCategories && (req.gender() == null || req.gender().isBlank())) {
            return Response.status(400).entity(Map.of("message", "Geschlecht ist bei diesem Wettkampf Pflichtfeld.")).build();
        }

        UUID linkedUserId = null;

        // Optionaler Account-Erstellung (E-Mail + Passwort)
        if (req.email() != null && !req.email().isBlank() && req.password() != null && req.password().length() >= 8) {
            String email = req.email().trim().toLowerCase();
            if (User.findByEmail(email) != null) {
                return Response.status(409).entity(Map.of("message", "Diese E-Mail-Adresse ist bereits registriert.")).build();
            }
            User user = new User();
            user.email = email;
            user.passwordHash = passwordService.hash(req.password());
            user.displayName = req.firstName() + " " + req.lastName();
            user.role = "ATHLETE";
            user.emailVerified = true; // vor Ort registriert, keine E-Mail-Verifikation nötig
            user.persist();
            linkedUserId = user.id;
        } else if (!identity.isAnonymous()) {
            try {
                linkedUserId = UUID.fromString(identity.getPrincipal().getName());
            } catch (IllegalArgumentException ignored) {}
        }

        Athlete athlete = new Athlete();
        athlete.orgId = comp.orgId;
        athlete.userId = linkedUserId;
        athlete.firstName = req.firstName();
        athlete.lastName = req.lastName();
        athlete.dateOfBirth = req.dateOfBirth() != null && !req.dateOfBirth().isBlank()
            ? LocalDate.parse(req.dateOfBirth()) : null;
        athlete.gender = req.gender();
        athlete.club = req.club();
        athlete.nation = req.nation();
        athlete.licenseNumber = req.licenseNumber();
        athlete.persist();

        Registration reg = new Registration();
        reg.compId = comp.id;
        reg.athleteId = athlete.id;
        reg.categoryId = comp.genderBasedCategories ? null : req.categoryId();
        reg.persist();

        return Response.status(201).entity(Map.of("registration", reg, "athlete", athlete)).build();
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
        entity.genderBasedCategories = data.genderBasedCategories;
        return Response.ok(entity).build();
    }

    @POST
    @Path("/{id}/generate-token")
    @Transactional
    public Response generateToken(@PathParam("id") UUID id) {
        Competition entity = Competition.findById(id);
        if (entity == null) return Response.status(404).build();
        String token;
        int attempts = 0;
        do {
            StringBuilder sb = new StringBuilder(8);
            for (int i = 0; i < 8; i++) sb.append(TOKEN_CHARS.charAt(RNG.nextInt(TOKEN_CHARS.length())));
            token = sb.toString();
            attempts++;
        } while (attempts < 100 && Competition.find("registrationToken", token).count() > 0);
        entity.registrationToken = token;
        return Response.ok(Map.of("token", token)).build();
    }

    @GET
    @Path("/{id}/hall-map")
    @Produces("*/*")
    public Response getHallMap(@PathParam("id") UUID id) {
        Competition entity = Competition.findById(id);
        if (entity == null || entity.hallMap == null) return Response.status(404).build();
        return Response.ok(entity.hallMap)
            .header("Content-Type", entity.hallMapContentType != null ? entity.hallMapContentType : "image/jpeg")
            .header("Cache-Control", "max-age=3600")
            .build();
    }

    @POST
    @Path("/{id}/hall-map")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Transactional
    public Response uploadHallMap(@PathParam("id") UUID id,
                                   @RestForm("file") FileUpload file) throws IOException {
        Competition entity = Competition.findById(id);
        if (entity == null) return Response.status(404).build();
        entity.hallMap = Files.readAllBytes(file.uploadedFile());
        entity.hallMapContentType = file.contentType();
        return Response.ok(Map.of("hallMapAvailable", true)).build();
    }

    @DELETE
    @Path("/{id}/hall-map")
    @Transactional
    public Response deleteHallMap(@PathParam("id") UUID id) {
        Competition entity = Competition.findById(id);
        if (entity == null) return Response.status(404).build();
        entity.hallMap = null;
        entity.hallMapContentType = null;
        return Response.noContent().build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        return Competition.deleteById(id) ? Response.noContent().build() : Response.status(404).build();
    }
}
