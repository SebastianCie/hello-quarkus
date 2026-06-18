package de.heim.apps.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "competition")
public class Competition extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "org_id", nullable = false)
    public UUID orgId;

    @Column(nullable = false)
    public String name;

    @Column(nullable = false)
    public String slug;

    @Column(nullable = false)
    public String discipline;

    @Column(nullable = false)
    public String format;

    @Column(nullable = false)
    public String status = "DRAFT";

    @Column(name = "start_date")
    public OffsetDateTime startDate;

    @Column(name = "end_date")
    public OffsetDateTime endDate;

    public String venue;

    @Column(name = "location_id")
    public UUID locationId;

    @Column(name = "self_registration")
    public boolean selfRegistration = false;

    @Column(name = "registration_opens_at")
    public OffsetDateTime registrationOpensAt;

    @Column(name = "registration_closes_at")
    public OffsetDateTime registrationClosesAt;

    @Column(name = "created_at")
    public OffsetDateTime createdAt = OffsetDateTime.now();
}
