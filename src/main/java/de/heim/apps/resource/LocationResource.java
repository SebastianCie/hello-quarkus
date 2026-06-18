package de.heim.apps.resource;

import de.heim.apps.entity.Location;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.UUID;

@Path("/api/v1/locations")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class LocationResource {

    @GET
    public List<Location> list(@QueryParam("orgId") UUID orgId) {
        if (orgId != null) return Location.list("orgId", orgId);
        return Location.listAll();
    }

    @GET
    @Path("/{id}")
    public Response get(@PathParam("id") UUID id) {
        Location entity = Location.findById(id);
        return entity != null ? Response.ok(entity).build() : Response.status(404).build();
    }

    @POST
    @Transactional
    public Response create(Location entity) {
        entity.id = null;
        entity.persist();
        return Response.status(201).entity(entity).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") UUID id, Location data) {
        Location entity = Location.findById(id);
        if (entity == null) return Response.status(404).build();
        entity.name = data.name;
        entity.address = data.address;
        entity.city = data.city;
        entity.country = data.country;
        return Response.ok(entity).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        return Location.deleteById(id) ? Response.noContent().build() : Response.status(404).build();
    }
}
