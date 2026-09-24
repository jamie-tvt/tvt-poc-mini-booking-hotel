package com.hotelbooking.domain.hotel;

import jakarta.persistence.*;
import java.time.Instant;

/** Phòng vật lý. Số phòng active của một loại phòng = total_rooms của các đêm trong room_inventory. */
@Entity
@Table(name = "rooms")
public class Room {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "hotel_id", nullable = false)
    private Long hotelId;
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "room_type_id")
    private RoomType roomType;
    @Column(name = "room_number", nullable = false)
    private String roomNumber;
    @Column(name = "is_active", nullable = false)
    private boolean active = true;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Room() {}

    public Room(RoomType roomType, String roomNumber, Instant now) {
        this.roomType = roomType;
        this.hotelId = roomType.getHotel().getId();
        this.roomNumber = roomNumber;
        this.createdAt = now;
    }

    public void renumber(String roomNumber) { this.roomNumber = roomNumber; }
    public void setActive(boolean active) { this.active = active; }

    public Long getId() { return id; }
    public Long getHotelId() { return hotelId; }
    public RoomType getRoomType() { return roomType; }
    public String getRoomNumber() { return roomNumber; }
    public boolean isActive() { return active; }
}
