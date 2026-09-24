package com.hotelbooking.domain.hotel;

import jakarta.persistence.*;

@Entity
@Table(name = "facility_categories")
public class FacilityCategory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private String name;

    protected FacilityCategory() {}
    public FacilityCategory(String name) { this.name = name; }

    public void rename(String name) { this.name = name; }

    public Long getId() { return id; }
    public String getName() { return name; }
}
