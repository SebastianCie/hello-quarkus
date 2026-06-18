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
import java.util.List;
import java.util.UUID;

@Path("/api/v1/organizations")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class OrganizationResource {

    @Inject
    SecurityIdentity identity;

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

        if (!identity.isAnonymous()) {
            OrgUser orgUser = new OrgUser();
            orgUser.orgId = org.id;
            orgUser.userId = UUID.fromString(identity.getPrincipal().getName());
            orgUser.role = "SUPERADMIN";
            orgUser.persist();
        }

        return Response.status(201).entity(org).build();
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
