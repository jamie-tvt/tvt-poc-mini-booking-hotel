package com.hotelbooking.domain.hotel;

import com.hotelbooking.domain.common.BusinessException;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "room_types")
public class RoomType {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "hotel_id")
    private Hotel hotel;
    @Column(nullable = false)
    private String name;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;
    @Column(nullable = false)
    private int capacity;
    @Column(name = "bed_info", nullable = false)
    private String bedInfo;
    @Column(name = "area_m2", nullable = false)
    private int areaM2;
    @Column(name = "base_price", nullable = false)
    private long basePrice;
    @Enumerated(EnumType.STRING)
    @Column(name = "cancellation_policy", nullable = false)
    private CancellationPolicy cancellationPolicy;
    @Column(name = "free_cancel_days")
    private Integer freeCancelDays;
    @Column(name = "image_url")
    private String imageUrl;
    @Column(name = "is_active", nullable = false)
    private boolean active = true;
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "room_type_facilities", joinColumns = @JoinColumn(name = "room_type_id"),
            inverseJoinColumns = @JoinColumn(name = "facility_id"))
    private Set<Facility> facilities = new LinkedHashSet<>();
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected RoomType() {}

    public RoomType(Hotel hotel, Instant now) {
        this.hotel = hotel;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void update(String name, String description, int capacity, String bedInfo, int areaM2, long basePrice,
                       CancellationPolicy policy, Integer freeCancelDays, String imageUrl, Set<Facility> facilities, Instant now) {
        if (capacity < 1 || capacity > 20) throw BusinessException.badRequest("Sức chứa từ 1 đến 20 khách");
        if (basePrice <= 0) throw BusinessException.badRequest("Giá cơ bản phải lớn hơn 0");
        if (policy == CancellationPolicy.FREE_BEFORE_DATE && (freeCancelDays == null || freeCancelDays < 0 || freeCancelDays > 60)) {
            throw BusinessException.badRequest("Chính sách huỷ miễn phí cần số ngày từ 0 đến 60");
        }
        this.name = name;
        this.description = description;
        this.capacity = capacity;
        this.bedInfo = bedInfo;
        this.areaM2 = areaM2;
        this.basePrice = basePrice;
        this.cancellationPolicy = policy;
        this.freeCancelDays = policy == CancellationPolicy.FREE_BEFORE_DATE ? freeCancelDays : null;
        this.imageUrl = imageUrl;
        this.facilities.clear();
        this.facilities.addAll(facilities);
        this.updatedAt = now;
    }

    public void deactivate(Instant now) { this.active = false; this.updatedAt = now; }

    /** Số khách tối đa cho n phòng loại này. */
    public boolean fits(int guests, int rooms) { return (long) capacity * rooms >= guests; }

    public List<Facility> sortedFacilities() {
        return facilities.stream().sorted(Comparator.comparing(Facility::getId)).toList();
    }

    public Long getId() { return id; }
    public Hotel getHotel() { return hotel; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public int getCapacity() { return capacity; }
    public String getBedInfo() { return bedInfo; }
    public int getAreaM2() { return areaM2; }
    public long getBasePrice() { return basePrice; }
    public CancellationPolicy getCancellationPolicy() { return cancellationPolicy; }
    public Integer getFreeCancelDays() { return freeCancelDays; }
    public String getImageUrl() { return imageUrl; }
    public boolean isActive() { return active; }
    public Set<Facility> getFacilities() { return facilities; }
}
