package de.heim.apps.resource;

import de.heim.apps.entity.Athlete;
import de.heim.apps.entity.Competition;
import de.heim.apps.entity.CompetitionCategory;
import de.heim.apps.entity.Registration;
import io.quarkus.security.identity.SecurityIdentity;
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

    record SelfRegisterRequest(
        String firstName, String lastName, String dateOfBirth,
        String gender, String club, String nation, String licenseNumber,
        UUID categoryId
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
        Response err = checkRegistrationOpen(comp);
        if (err != null) return err;
        List<CompetitionCategory> categories = CompetitionCategory.list("compId", comp.id);
        return Response.ok(Map.of("competition", comp, "categories", categories)).build();
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

        UUID keycloakUserId = null;
        if (!identity.isAnonymous()) {
            try {
                keycloakUserId = UUID.fromString(identity.getPrincipal().getName());
            } catch (IllegalArgumentException ignored) {}
        }

        Athlete athlete = new Athlete();
        athlete.orgId = comp.orgId;
        athlete.userId = keycloakUserId;
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
        reg.categoryId = req.categoryId();
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
