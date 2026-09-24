package com.hotelbooking.application.hotel;

import com.hotelbooking.application.audit.AuditService;
import com.hotelbooking.application.hotel.HotelCommands.HotelCommand;
import com.hotelbooking.application.hotel.HotelCommands.RoomTypeCommand;
import com.hotelbooking.application.inventory.InventoryService;
import com.hotelbooking.application.user.UserService;
import com.hotelbooking.domain.common.BusinessDay;
import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.common.TimeProvider;
import com.hotelbooking.domain.hotel.*;
import com.hotelbooking.domain.user.Role;
import com.hotelbooking.domain.user.User;
import com.hotelbooking.infrastructure.persistence.jpa.*;
import com.hotelbooking.infrastructure.security.AuthUser;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Hotel Portal: hồ sơ khách sạn, loại phòng, phòng, giá theo ngày, nhân viên. Mọi thao tác đi qua HotelScope. */
@Service
public class PortalHotelService {
    private final HotelScope scope;
    private final JpaHotelRepository hotels;
    private final JpaHotelImageRepository images;
    private final JpaRoomTypeRepository roomTypes;
    private final JpaRoomRepository rooms;
    private final JpaFacilityRepository facilities;
    private final JpaBookingRepository bookings;
    private final JpaUserRepository users;
    private final InventoryService inventory;
    private final UserService userService;
    private final AuditService audit;
    private final TimeProvider time;

    public PortalHotelService(HotelScope scope, JpaHotelRepository hotels, JpaHotelImageRepository images, JpaRoomTypeRepository roomTypes,
                              JpaRoomRepository rooms, JpaFacilityRepository facilities, JpaBookingRepository bookings, JpaUserRepository users,
                              InventoryService inventory, UserService userService, AuditService audit, TimeProvider time) {
        this.scope = scope;
        this.hotels = hotels;
        this.images = images;
        this.roomTypes = roomTypes;
        this.rooms = rooms;
        this.facilities = facilities;
        this.bookings = bookings;
        this.users = users;
        this.inventory = inventory;
        this.userService = userService;
        this.audit = audit;
        this.time = time;
    }

    // ------------------------------------------------------------------ khách sạn
    @Transactional(readOnly = true)
    public List<Hotel> myHotels(AuthUser me) { return hotels.findAllById(scope.hotelIds(me)).stream().sorted((a, b) -> a.getId().compareTo(b.getId())).toList(); }

    @Transactional(readOnly = true)
    public Hotel hotel(AuthUser me, Long id) { return scope.hotel(me, id); }

    @Transactional
    public Hotel createHotel(AuthUser me, HotelCommand c) {
        Instant now = time.now();
        Hotel h = new Hotel(me.id(), now);
        apply(h, c, now);
        h = hotels.save(h);
        if (h.getCoverImageUrl() != null) images.save(new HotelImage(h.getId(), h.getCoverImageUrl(), 0));
        audit.log(me.id(), "CREATE", "hotel", h.getId(), h.getName());
        return h;
    }

    @Transactional
    public Hotel updateHotel(AuthUser me, Long id, HotelCommand c) {
        Hotel h = scope.ownedHotel(me, id);
        HotelStatus before = h.getStatus();
        apply(h, c, time.now());
        audit.log(me.id(), "UPDATE", "hotel", id, before == h.getStatus() ? null : before + " → " + h.getStatus());
        return h;
    }

    private static void apply(Hotel h, HotelCommand c, Instant now) {
        h.updateProfile(c.name().trim(), c.city().trim(), c.address().trim(), c.description().trim(), c.starRating(), blank(c.phone()),
                c.checkInTime(), c.checkOutTime(), blank(c.coverImageUrl()), now);
    }

    // ------------------------------------------------------------------ loại phòng
    @Transactional(readOnly = true)
    public List<RoomType> roomTypes(AuthUser me, Long hotelId) {
        scope.hotel(me, hotelId);
        return roomTypes.findByHotelIdAndActiveTrueOrderByIdAsc(hotelId);
    }

    @Transactional
    public RoomType createRoomType(AuthUser me, Long hotelId, RoomTypeCommand c) {
        Hotel h = scope.ownedHotel(me, hotelId);
        RoomType t = new RoomType(h, time.now());
        apply(t, c);
        t = roomTypes.save(t);
        audit.log(me.id(), "CREATE", "room_type", t.getId(), t.getName());
        return t;
    }

    @Transactional
    public RoomType updateRoomType(AuthUser me, Long id, RoomTypeCommand c) {
        RoomType t = scope.roomType(me, id, true);
        apply(t, c);
        audit.log(me.id(), "UPDATE", "room_type", id, null);
        return t;
    }

    /** Xoá mềm; còn booking đang giữ phòng chưa trả phòng → 409. */
    @Transactional
    public void deleteRoomType(AuthUser me, Long id) {
        RoomType t = scope.roomType(me, id, true);
        if (bookings.countActiveForRoomType(id, BusinessDay.today(time)) > 0) {
            throw BusinessException.conflict("Loại phòng còn đơn đặt chưa hoàn tất nên chưa thể xoá");
        }
        t.deactivate(time.now());
        audit.log(me.id(), "DELETE", "room_type", id, t.getName());
    }

    private void apply(RoomType t, RoomTypeCommand c) {
        Set<Facility> fs = new LinkedHashSet<>();
        List<Long> ids = c.facilityIds() == null ? List.of() : c.facilityIds();
        if (!ids.isEmpty()) {
            fs.addAll(facilities.findAllById(ids));
            if (fs.size() != new HashSet<>(ids).size()) throw BusinessException.badRequest("Có tiện nghi không tồn tại");
        }
        t.update(c.name().trim(), c.description().trim(), c.capacity(), c.bedInfo().trim(), c.areaM2(), c.basePrice(),
                c.cancellationPolicy(), c.freeCancelDays(), blank(c.imageUrl()), fs, time.now());
    }

    // ------------------------------------------------------------------ phòng
    public record RoomView(Room room, boolean occupied) {}

    @Transactional(readOnly = true)
    public List<RoomView> rooms(AuthUser me, Long roomTypeId) {
        scope.roomType(me, roomTypeId, false);
        List<Room> list = rooms.findByRoomTypeIdOrderByRoomNumberAsc(roomTypeId);
        Set<Long> occupied = list.isEmpty() ? Set.of() : new HashSet<>(rooms.occupiedAmong(list.stream().map(Room::getId).toList()));
        return list.stream().map(r -> new RoomView(r, occupied.contains(r.getId()))).toList();
    }

    /** Thêm phòng: khoá room_type (mutex) → thêm phòng → cập nhật total_rooms các đêm từ hôm nay. */
    @Transactional
    public RoomView addRoom(AuthUser me, Long roomTypeId, String roomNumber) {
        RoomType t = scope.roomType(me, roomTypeId, true);
        roomTypes.lockForUpdate(roomTypeId);
        String number = roomNumber.trim();
        if (rooms.existsByHotelIdAndRoomNumber(t.getHotel().getId(), number)) throw BusinessException.conflict("Số phòng " + number + " đã tồn tại");
        Room r = rooms.save(new Room(t, number, time.now()));
        inventory.syncTotals(roomTypeId, BusinessDay.today(time));
        audit.log(me.id(), "CREATE", "room", r.getId(), t.getName() + " #" + number);
        return new RoomView(r, false);
    }

    /** Tắt phòng mà đêm tương lai đã bán hết số phòng còn lại → 409 (không được xuống dưới booked_rooms). */
    @Transactional
    public RoomView updateRoom(AuthUser me, Long roomId, String roomNumber, boolean active) {
        Room snapshot = scope.ownedRoom(me, roomId);
        Long typeId = snapshot.getRoomType().getId();
        roomTypes.lockForUpdate(typeId);
        Room r = rooms.findByIdForUpdate(roomId).orElseThrow();
        String number = roomNumber.trim();
        if (!number.equals(r.getRoomNumber()) && rooms.existsByHotelIdAndRoomNumber(r.getHotelId(), number)) {
            throw BusinessException.conflict("Số phòng " + number + " đã tồn tại");
        }
        boolean occupied = !rooms.occupiedAmong(List.of(roomId)).isEmpty();
        if (!active && occupied) throw BusinessException.conflict("Phòng đang có khách, chưa thể tạm ngừng");
        boolean changed = r.isActive() != active;
        r.renumber(number);
        r.setActive(active);
        if (changed) {
            rooms.flush();
            inventory.syncTotals(typeId, BusinessDay.today(time));
        }
        audit.log(me.id(), "UPDATE", "room", roomId, number + (changed ? (active ? " bật" : " tắt") : ""));
        return new RoomView(r, occupied);
    }

    // ------------------------------------------------------------------ giá theo ngày
    public int setPrices(AuthUser me, Long roomTypeId, LocalDate from, LocalDate to, Long price) {
        if (to.isBefore(from)) throw BusinessException.badRequest("Ngày kết thúc phải từ ngày bắt đầu trở đi");
        if (from.isBefore(BusinessDay.today(time))) throw BusinessException.badRequest("Không đặt giá cho ngày đã qua");
        if (from.datesUntil(to.plusDays(1)).count() > 366) throw BusinessException.badRequest("Mỗi lần đặt giá tối đa 366 ngày");
        if (price != null && price <= 0) throw BusinessException.badRequest("Giá phải lớn hơn 0");
        scopeCheckRoomType(me, roomTypeId);
        int n = inventory.setPrices(roomTypeId, from, to, price);
        audit.log(me.id(), "SET_PRICE", "room_type", roomTypeId, from + ".." + to + " = " + price);
        return n;
    }

    @Transactional(readOnly = true)
    public void scopeCheckRoomType(AuthUser me, Long roomTypeId) { scope.roomType(me, roomTypeId, true); }

    // ------------------------------------------------------------------ nhân viên (FR-USR-004/005)
    @Transactional(readOnly = true)
    public List<User> staff(AuthUser me, Long hotelId) {
        scope.ownedHotel(me, hotelId);
        return users.findStaffOfHotel(hotelId);
    }

    @Transactional
    public User createStaff(AuthUser me, Long hotelId, String fullName, String email, String password, String phone) {
        scope.ownedHotel(me, hotelId);
        return userService.create(fullName, email, password, phone, Role.HOTEL_STAFF, hotelId, me.id());
    }

    @Transactional
    public User setStaffActive(AuthUser me, Long staffId, boolean active) {
        User u = users.findById(staffId).filter(x -> x.getRole() == Role.HOTEL_STAFF)
                .orElseThrow(() -> BusinessException.notFound("nhân viên"));
        scope.ownedHotel(me, u.getHotelId());
        return userService.setActive(staffId, active, me.id());
    }

    private static String blank(String s) { return s == null || s.isBlank() ? null : s.trim(); }
}
