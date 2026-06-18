package de.heim.apps.resource;

import de.heim.apps.entity.Athlete;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.UUID;

@Path("/api/v1/athletes")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AthleteResource {

    @GET
    public List<Athlete> list() {
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
        entity.userId = data.userId;
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
        return Athlete.deleteById(id) ? Response.noContent().build() : Response.status(404).build();
    }
}
