package com.hotelbooking.application.hotel;

import com.hotelbooking.domain.booking.BookingRef;
import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.hotel.Hotel;
import com.hotelbooking.domain.hotel.Room;
import com.hotelbooking.domain.hotel.RoomType;
import com.hotelbooking.domain.user.Role;
import com.hotelbooking.infrastructure.persistence.jpa.JpaBookingRepository;
import com.hotelbooking.infrastructure.persistence.jpa.JpaHotelRepository;
import com.hotelbooking.infrastructure.persistence.jpa.JpaRoomRepository;
import com.hotelbooking.infrastructure.persistence.jpa.JpaRoomTypeRepository;
import com.hotelbooking.infrastructure.security.AuthUser;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Cách ly theo khách sạn (NFR-SEC-05): owner chỉ thấy khách sạn mình sở hữu, staff chỉ khách sạn được gán.
 * Ngoài phạm vi → 404 (không tiết lộ đối tượng có tồn tại). Mọi service portal đi qua lớp này.
 */
@Component
public class HotelScope {
    private final JpaHotelRepository hotels;
    private final JpaRoomTypeRepository roomTypes;
    private final JpaRoomRepository rooms;
    private final JpaBookingRepository bookings;

    public HotelScope(JpaHotelRepository hotels, JpaRoomTypeRepository roomTypes, JpaRoomRepository rooms, JpaBookingRepository bookings) {
        this.hotels = hotels;
        this.roomTypes = roomTypes;
        this.rooms = rooms;
        this.bookings = bookings;
    }

    public List<Long> hotelIds(AuthUser u) {
        if (u.is(Role.HOTEL_OWNER)) return hotels.findByOwnerIdOrderByIdAsc(u.id()).stream().map(Hotel::getId).toList();
        if (u.is(Role.HOTEL_STAFF) && u.hotelId() != null) return List.of(u.hotelId());
        return List.of();
    }

    public boolean covers(AuthUser u, Long hotelId, Long ownerId) {
        if (u.is(Role.HOTEL_OWNER)) return ownerId.equals(u.id());
        if (u.is(Role.HOTEL_STAFF)) return hotelId.equals(u.hotelId());
        return false;
    }

    /** Owner/staff trong phạm vi. */
    public Hotel hotel(AuthUser u, Long hotelId) {
        Hotel h = hotels.findById(hotelId).orElseThrow(() -> BusinessException.notFound("khách sạn"));
        if (!covers(u, h.getId(), h.getOwnerId())) throw BusinessException.notFound("khách sạn");
        return h;
    }

    /** Chỉ chủ sở hữu. */
    public Hotel ownedHotel(AuthUser u, Long hotelId) {
        Hotel h = hotel(u, hotelId);
        if (!h.isOwnedBy(u.id())) throw BusinessException.notFound("khách sạn");
        return h;
    }

    public RoomType roomType(AuthUser u, Long roomTypeId, boolean ownerOnly) {
        RoomType t = roomTypes.findById(roomTypeId).filter(RoomType::isActive).orElseThrow(() -> BusinessException.notFound("loại phòng"));
        Hotel h = t.getHotel();
        if (!covers(u, h.getId(), h.getOwnerId()) || (ownerOnly && !h.isOwnedBy(u.id()))) throw BusinessException.notFound("loại phòng");
        return t;
    }

    public Room ownedRoom(AuthUser u, Long roomId) {
        Room r = rooms.findById(roomId).orElseThrow(() -> BusinessException.notFound("phòng"));
        if (!r.getRoomType().getHotel().isOwnedBy(u.id()) || !u.is(Role.HOTEL_OWNER)) throw BusinessException.notFound("phòng");
        return r;
    }

    /** Projection (không nạp entity) để kiểm phạm vi trước khi khoá. */
    public BookingRef booking(AuthUser u, Long bookingId) {
        BookingRef ref = bookings.findRef(bookingId).orElseThrow(() -> BusinessException.notFound("đơn đặt phòng"));
        if (!hotelIds(u).contains(ref.hotelId())) throw BusinessException.notFound("đơn đặt phòng");
        return ref;
    }
}
