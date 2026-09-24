package com.hotelbooking.domain.inventory;

import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.common.ErrorCode;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Tồn kho một đêm của một loại phòng. Mọi thay đổi booked/total chỉ được làm khi đã khoá dòng
 * (SELECT ... FOR UPDATE); CHECK (booked_rooms <= total_rooms) ở DB là lớp chặn thứ hai.
 */
@Entity
@Table(name = "room_inventory")
public class RoomInventory {
    private static final DateTimeFormatter DMY = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "room_type_id", nullable = false)
    private Long roomTypeId;
    @Column(name = "stay_date", nullable = false)
    private LocalDate stayDate;
    @Column(name = "total_rooms", nullable = false)
    private int totalRooms;
    @Column(name = "booked_rooms", nullable = false)
    private int bookedRooms;
    @Column(name = "price_override")
    private Long priceOverride;

    protected RoomInventory() {}

    public RoomInventory(Long roomTypeId, LocalDate stayDate, int totalRooms) {
        this.roomTypeId = roomTypeId;
        this.stayDate = stayDate;
        this.totalRooms = totalRooms;
    }

    public int available() { return totalRooms - bookedRooms; }

    public void reserve(int rooms) {
        if (available() < rooms) {
            throw new BusinessException(ErrorCode.ROOM_UNAVAILABLE, available() <= 0
                    ? "Loại phòng này đã hết phòng đêm " + stayDate.format(DMY)
                    : "Đêm " + stayDate.format(DMY) + " chỉ còn " + available() + " phòng");
        }
        bookedRooms += rooms;
    }

    public void release(int rooms) { bookedRooms = Math.max(0, bookedRooms - rooms); }

    /** Thêm/tắt phòng: tổng phòng không được nhỏ hơn số phòng đã bán của đêm đó. */
    public void changeTotal(int newTotal) {
        if (newTotal < bookedRooms) {
            throw BusinessException.conflict("Đêm " + stayDate.format(DMY) + " đã bán " + bookedRooms
                    + " phòng, không thể giảm tổng phòng xuống " + newTotal);
        }
        totalRooms = newTotal;
    }

    public void setPriceOverride(Long price) { this.priceOverride = price; }

    /** Giá cơ bản của đêm: giá riêng theo ngày nếu có, không thì giá của loại phòng. */
    public long basePrice(long roomTypeBasePrice) { return priceOverride != null ? priceOverride : roomTypeBasePrice; }

    public Long getId() { return id; }
    public Long getRoomTypeId() { return roomTypeId; }
    public LocalDate getStayDate() { return stayDate; }
    public int getTotalRooms() { return totalRooms; }
    public int getBookedRooms() { return bookedRooms; }
    public Long getPriceOverride() { return priceOverride; }
}
