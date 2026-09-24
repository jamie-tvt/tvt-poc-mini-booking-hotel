package com.hotelbooking.infrastructure.persistence.jpa;

import com.hotelbooking.domain.booking.Booking;
import com.hotelbooking.domain.booking.BookingRef;
import com.hotelbooking.domain.booking.BookingStatus;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JpaBookingRepository extends JpaRepository<Booking, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") Long id);

    String REF = "select new com.hotelbooking.domain.booking.BookingRef(b.id, b.bookingCode, b.accessKey, b.userId, b.hotel.id, "
            + "b.roomType.id, b.checkIn, b.checkOut, b.guestEmail) ";

    @Query(REF + "from Booking b where b.id = :id")
    Optional<BookingRef> findRef(@Param("id") Long id);

    @Query(REF + "from Booking b where b.bookingCode = :code")
    Optional<BookingRef> findRefByCode(@Param("code") String code);

    @Query(REF + "from Payment p join p.invoice i join i.booking b where p.id = :paymentId")
    Optional<BookingRef> findRefByPayment(@Param("paymentId") Long paymentId);

    boolean existsByBookingCode(String code);
    boolean existsByAccessKey(String key);
    Optional<Booking> findByBookingCode(String code);

    @Query("select b from Booking b where b.userId = :userId and (:status is null or b.status = :status) order by b.bookedAt desc")
    Page<Booking> findMine(@Param("userId") Long userId, @Param("status") BookingStatus status, Pageable pageable);

    /** Portal: luôn giới hạn trong các khách sạn thuộc phạm vi người gọi (hotelIds do HotelScope tính). */
    @Query("""
            select b from Booking b
            where b.hotel.id in :hotelIds
              and (:status is null or b.status = :status)
              and (:date is null or b.checkIn = :date or b.checkOut = :date)
              and (:keyword is null or lower(b.bookingCode) like lower(concat('%', :keyword, '%'))
                   or lower(b.guestName) like lower(concat('%', :keyword, '%')) or b.guestPhone like concat('%', :keyword, '%'))
            order by b.checkIn desc, b.id desc
            """)
    Page<Booking> portalSearch(@Param("hotelIds") Collection<Long> hotelIds, @Param("status") BookingStatus status,
                               @Param("date") LocalDate date, @Param("keyword") String keyword, Pageable pageable);

    @Query("""
            select b from Booking b
            where (:status is null or b.status = :status)
              and (:hotelId is null or b.hotel.id = :hotelId)
              and (:keyword is null or lower(b.bookingCode) like lower(concat('%', :keyword, '%'))
                   or lower(b.guestName) like lower(concat('%', :keyword, '%')) or lower(b.guestEmail) like lower(concat('%', :keyword, '%'))
                   or lower(b.hotel.name) like lower(concat('%', :keyword, '%')))
            order by b.bookedAt desc
            """)
    Page<Booking> adminSearch(@Param("status") BookingStatus status, @Param("hotelId") Long hotelId,
                              @Param("keyword") String keyword, Pageable pageable);

    @Query("select b.id from Booking b where b.status = 'PENDING' and b.expiresAt <= :now")
    List<Long> findOverdueIds(@Param("now") Instant now);

    /** Còn booking đang giữ phòng chưa tới ngày trả phòng → không được xoá loại phòng. */
    @Query("select count(b) from Booking b where b.roomType.id = :rt and b.status in ('PENDING','CONFIRMED','CHECKED_IN') and b.checkOut > :today")
    long countActiveForRoomType(@Param("rt") Long roomTypeId, @Param("today") LocalDate today);

    long countByStatus(BookingStatus status);
}
