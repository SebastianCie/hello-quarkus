package de.heim.apps.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "scoring_config")
public class ScoringConfig extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "comp_id", nullable = false)
    public UUID compId;

    @Column(name = "event_type", nullable = false)
    public String eventType;

    @Column(nullable = false, precision = 8, scale = 2)
    public BigDecimal points;

    public String label;

    @Column(name = "sort_order")
    public int sortOrder = 0;
}
