package de.heim.apps.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "route")
public class Route extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "comp_id", nullable = false)
    public UUID compId;

    @Column(name = "route_number")
    public String routeNumber;

    public String name;

    public String grade;

    @Column(name = "max_score")
    public Integer maxScore;

    @Column(name = "sort_order")
    public Integer sortOrder;

    @Column(name = "category_id")
    public UUID categoryId;
}
