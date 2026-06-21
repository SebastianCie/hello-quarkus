package de.heim.apps.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "round_category_status")
public class RoundCategoryStatus extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "round_id", nullable = false)
    public UUID roundId;

    @Column(name = "category_id", nullable = false)
    public UUID categoryId;

    @Column(nullable = false)
    public String status = "ACTIVE"; // ACTIVE | CLOSED
}
