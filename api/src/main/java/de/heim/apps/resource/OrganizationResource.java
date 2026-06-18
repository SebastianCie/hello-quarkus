package de.heim.apps.resource;

import de.heim.apps.entity.Location;
import de.heim.apps.entity.Organization;
import de.heim.apps.entity.OrgUser;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Path("/api/v1/organizations")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class OrganizationResource {

    @Inject
    SecurityIdentity identity;

    @ConfigProperty(name = "beta-battle.dev-user-id", defaultValue = "")
    String devUserId;

    public record SetupRequest(
        String name, String slug, String contactEmail, String logoUrl,
        String locationName, String locationCity, String locationAddress
    ) {}

    @GET
    public List<Organization> list() {
        return Organization.listAll();
    }

    @GET
    @Path("/{id}")
    public Response get(@PathParam("id") UUID id) {
        Organization entity = Organization.findById(id);
        return entity != null ? Response.ok(entity).build() : Response.status(404).build();
    }

    /**
     * Called after login: creates org + first location + org_user(SUPERADMIN)
     * linked to the currently authenticated user.
     */
    @POST
    @Path("/setup")
    @Transactional
    public Response setup(SetupRequest req) {
        Organization org = new Organization();
        org.name = req.name();
        org.slug = req.slug();
        org.contactEmail = req.contactEmail();
        org.logoUrl = req.logoUrl();
        org.persist();

        Location location = new Location();
        location.orgId = org.id;
        location.name = req.locationName();
        location.city = req.locationCity();
        location.address = req.locationAddress();
        location.persist();

        Optional<UUID> userId = resolveUserId();
        if (userId.isEmpty()) {
            return Response.status(401).entity("Nicht authentifiziert").build();
        }
        OrgUser orgUser = new OrgUser();
        orgUser.orgId = org.id;
        orgUser.userId = userId.get();
        orgUser.role = "SUPERADMIN";
        orgUser.persist();

        return Response.status(201).entity(org).build();
    }

    private Optional<UUID> resolveUserId() {
        if (!identity.isAnonymous()) {
            return Optional.of(UUID.fromString(identity.getPrincipal().getName()));
        }
        if (!devUserId.isBlank()) {
            return Optional.of(UUID.fromString(devUserId));
        }
        return Optional.empty();
    }

    @POST
    @Transactional
    public Response create(Organization entity) {
        entity.id = null;
        entity.persist();
        return Response.status(201).entity(entity).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") UUID id, Organization data) {
        Organization entity = Organization.findById(id);
        if (entity == null) return Response.status(404).build();
        entity.name = data.name;
        entity.slug = data.slug;
        entity.contactEmail = data.contactEmail;
        entity.logoUrl = data.logoUrl;
        return Response.ok(entity).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        return Organization.deleteById(id) ? Response.noContent().build() : Response.status(404).build();
    }
}
