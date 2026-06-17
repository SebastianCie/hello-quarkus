package de.heim.apps.resource;

import de.heim.apps.entity.OrgUser;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.UUID;

@Path("/api/org-users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class OrgUserResource {

    @GET
    public List<OrgUser> list(@QueryParam("orgId") UUID orgId) {
        if (orgId != null) return OrgUser.list("orgId", orgId);
        return OrgUser.listAll();
    }

    @GET
    @Path("/{id}")
    public Response get(@PathParam("id") UUID id) {
        OrgUser entity = OrgUser.findById(id);
        return entity != null ? Response.ok(entity).build() : Response.status(404).build();
    }

    @POST
    @Transactional
    public Response create(OrgUser entity) {
        entity.id = null;
        entity.persist();
        return Response.status(201).entity(entity).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") UUID id, OrgUser data) {
        OrgUser entity = OrgUser.findById(id);
        if (entity == null) return Response.status(404).build();
        entity.orgId = data.orgId;
        entity.userId = data.userId;
        entity.role = data.role;
        return Response.ok(entity).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        return OrgUser.deleteById(id) ? Response.noContent().build() : Response.status(404).build();
    }
}
