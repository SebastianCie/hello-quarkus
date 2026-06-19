package de.heim.apps.resource;

import de.heim.apps.entity.Route;
import jakarta.persistence.PersistenceException;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/api/v1/routes")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class RouteResource {

    @GET
    public List<Route> list(@QueryParam("compId") UUID compId) {
        if (compId != null) return Route.list("compId", compId);
        return Route.listAll();
    }

    @GET
    @Path("/{id}")
    public Response get(@PathParam("id") UUID id) {
        Route entity = Route.findById(id);
        return entity != null ? Response.ok(entity).build() : Response.status(404).build();
    }

    @POST
    @Transactional
    public Response create(Route entity) {
        entity.id = null;
        try {
            entity.persist();
            return Response.status(201).entity(entity).build();
        } catch (PersistenceException e) {
            return duplicateError(e);
        }
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") UUID id, Route data) {
        Route entity = Route.findById(id);
        if (entity == null) return Response.status(404).build();
        entity.compId = data.compId;
        entity.routeNumber = data.routeNumber;
        entity.name = data.name;
        entity.grade = data.grade;
        entity.maxScore = data.maxScore;
        entity.sortOrder = data.sortOrder;
        entity.categoryId = data.categoryId;
        try {
            return Response.ok(entity).build();
        } catch (PersistenceException e) {
            return duplicateError(e);
        }
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        return Route.deleteById(id) ? Response.noContent().build() : Response.status(404).build();
    }

    private Response duplicateError(PersistenceException e) {
        String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
        String field = msg.contains("unique_number") ? "Nummer"
                     : msg.contains("unique_name")   ? "Name"
                     : msg.contains("unique_sort")   ? "Reihenfolge"
                     : "Feld";
        return Response.status(409)
            .entity(Map.of("message", field + " existiert bereits in dieser Kategorie."))
            .build();
    }
}
