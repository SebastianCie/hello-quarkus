package de.heim.apps.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

@Entity
@Table(name = "app_settings")
public class AppSettings extends PanacheEntityBase {

    @Id
    public String key;

    @Column(nullable = false)
    public String value;
}
