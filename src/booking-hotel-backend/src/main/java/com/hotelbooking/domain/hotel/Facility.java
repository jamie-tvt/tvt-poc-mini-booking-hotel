package com.hotelbooking.domain.hotel;

import jakarta.persistence.*;

@Entity
@Table(name = "facilities")
public class Facility {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "category_id")
    private FacilityCategory category;
    @Column(nullable = false)
    private String name;
    /** Tên icon lucide, VD "wifi". */
    @Column(nullable = false)
    private String icon;

    protected Facility() {}
    public Facility(FacilityCategory category, String name, String icon) { this.category = category; this.name = name; this.icon = icon; }

    public void update(FacilityCategory category, String name, String icon) { this.category = category; this.name = name; this.icon = icon; }

    public Long getId() { return id; }
    public FacilityCategory getCategory() { return category; }
    public String getName() { return name; }
    public String getIcon() { return icon; }
}
