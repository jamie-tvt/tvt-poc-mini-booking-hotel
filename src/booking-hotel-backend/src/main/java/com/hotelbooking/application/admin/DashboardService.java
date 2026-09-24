package com.hotelbooking.application.admin;

import com.hotelbooking.domain.booking.Booking;
import com.hotelbooking.domain.booking.BookingStatus;
import com.hotelbooking.domain.common.BusinessDay;
import com.hotelbooking.domain.common.TimeProvider;
import com.hotelbooking.domain.hotel.HotelStatus;
import com.hotelbooking.infrastructure.persistence.jpa.*;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {
    public record Dashboard(Map<String, Long> hotels, Map<String, Long> bookings, Map<String, Long> revenue,
                            Map<String, Long> occupancyTonight, Map<String, Long> users, List<Booking> recentBookings) {}

    private final JpaHotelRepository hotels;
    private final JpaBookingRepository bookings;
    private final JpaPaymentRepository payments;
    private final JpaRoomInventoryRepository inventory;
    private final JpaRoomRepository rooms;
    private final JpaUserRepository users;
    private final TimeProvider time;

    public DashboardService(JpaHotelRepository hotels, JpaBookingRepository bookings, JpaPaymentRepository payments,
                            JpaRoomInventoryRepository inventory, JpaRoomRepository rooms, JpaUserRepository users, TimeProvider time) {
        this.hotels = hotels;
        this.bookings = bookings;
        this.payments = payments;
        this.inventory = inventory;
        this.rooms = rooms;
        this.users = users;
        this.time = time;
    }

    @Transactional(readOnly = true)
    public Dashboard build() {
        Map<String, Long> b = new LinkedHashMap<>();
        for (BookingStatus s : BookingStatus.values()) b.put(s.name(), bookings.countByStatus(s));
        Map<String, Long> h = new LinkedHashMap<>();
        h.put("total", hotels.count());
        h.put("active", hotels.countByStatus(HotelStatus.ACTIVE));
        h.put("pending", hotels.countByStatus(HotelStatus.PENDING_APPROVAL));
        Map<String, Long> revenue = new LinkedHashMap<>();
        revenue.put("gross", payments.sumCollected());
        revenue.put("platformFee", payments.sumPlatformFee());
        revenue.put("refunded", payments.sumRefunded());
        Map<String, Long> occupancy = new LinkedHashMap<>();
        occupancy.put("booked", inventory.bookedOn(BusinessDay.today(time)));
        occupancy.put("total", rooms.countSellable());
        return new Dashboard(h, b, revenue, occupancy, Map.of("total", users.count()),
                bookings.adminSearch(null, null, null, PageRequest.of(0, 8)).getContent());
    }
}
