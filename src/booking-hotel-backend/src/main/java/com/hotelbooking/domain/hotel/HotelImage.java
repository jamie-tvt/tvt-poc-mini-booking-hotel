package com.hotelbooking.domain.hotel;

import jakarta.persistence.*;

@Entity
@Table(name = "hotel_images")
public class HotelImage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "hotel_id", nullable = false)
    private Long hotelId;
    @Column(name = "image_url", nullable = false)
    private String imageUrl;
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected HotelImage() {}
    public HotelImage(Long hotelId, String imageUrl, int sortOrder) { this.hotelId = hotelId; this.imageUrl = imageUrl; this.sortOrder = sortOrder; }

    public Long getId() { return id; }
    public Long getHotelId() { return hotelId; }
    public String getImageUrl() { return imageUrl; }
    public int getSortOrder() { return sortOrder; }
}
