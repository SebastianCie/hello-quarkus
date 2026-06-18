package de.heim.apps.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "competition_category")
public class CompetitionCategory extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "comp_id", nullable = false)
    public UUID compId;

    @Column(nullable = false)
    public String name;

    public String gender;

    @Column(name = "age_min")
    public String ageMin;

    @Column(name = "age_max")
    public String ageMax;

    @Column(name = "max_participants")
    public Integer maxParticipants;
}
