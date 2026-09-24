package com.hotelbooking.presentation.booking;

import com.hotelbooking.application.booking.BookingService;
import com.hotelbooking.application.booking.BookingService.CreateBooking;
import com.hotelbooking.domain.booking.Booking;
import com.hotelbooking.domain.booking.BookingStatus;
import com.hotelbooking.domain.user.Role;
import com.hotelbooking.infrastructure.security.AuthUser;
import com.hotelbooking.presentation.common.*;
import com.hotelbooking.presentation.common.DtoMapper.View;
import com.hotelbooking.presentation.common.Dtos.BookingDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Đặt phòng phía khách — không cần tài khoản (guest checkout). Mọi thao tác trên một booking dùng code + key. */
@RestController
@RequestMapping("/api/v1")
public class BookingController {
    public record CreateBookingRequest(@NotNull(message = "Vui lòng chọn loại phòng") Long roomTypeId,
                                       @NotNull(message = "Vui lòng chọn ngày nhận phòng") LocalDate checkIn,
                                       @NotNull(message = "Vui lòng chọn ngày trả phòng") LocalDate checkOut,
                                       @Min(value = 1, message = "Tối thiểu 1 phòng") @Max(value = 5, message = "Tối đa 5 phòng mỗi đơn") int roomsCount,
                                       @Min(value = 1, message = "Tối thiểu 1 khách") @Max(100) int guests,
                                       @NotBlank(message = "Vui lòng nhập họ tên") @Size(max = 120) String guestName,
                                       @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") @Size(max = 160) String guestEmail,
                                       @NotBlank(message = "Vui lòng nhập số điện thoại") @Pattern(regexp = "^0\\d{9,10}$", message = "Số điện thoại không hợp lệ") String guestPhone,
                                       @Size(max = 500) String note) {}
    public record LookupRequest(@NotBlank(message = "Vui lòng nhập mã đặt phòng") String bookingCode,
                                @NotBlank(message = "Vui lòng nhập email") String email) {}
    public record CancelRequest(@Size(max = 255) String reason) {}

    private final BookingService bookings;
    private final DtoMapper map;

    public BookingController(BookingService bookings, DtoMapper map) {
        this.bookings = bookings;
        this.map = map;
    }

    /** Có token CUSTOMER thì gắn đơn vào tài khoản; không có vẫn đặt được. */
    @PostMapping("/bookings")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<BookingDto> create(@Valid @RequestBody CreateBookingRequest r, @AuthenticationPrincipal AuthUser me) {
        Long userId = me != null && me.is(Role.CUSTOMER) ? me.id() : null;
        Booking b = bookings.create(new CreateBooking(r.roomTypeId(), r.checkIn(), r.checkOut(), r.roomsCount(), r.guests(),
                new Booking.Guest(r.guestName().trim(), r.guestEmail().trim(), r.guestPhone().trim(),
                        r.note() == null || r.note().isBlank() ? null : r.note().trim())), userId);
        return ApiResponse.ok(map.booking(b, View.GUEST), "Đã giữ phòng, vui lòng thanh toán", 201);
    }

    @GetMapping("/bookings/code/{code}")
    public ApiResponse<BookingDto> get(@PathVariable String code, @RequestParam(required = false) String key, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.booking(bookings.getByCode(code, key, me == null ? null : me.id()), View.GUEST));
    }

    @PostMapping("/bookings/lookup")
    public ApiResponse<BookingDto> lookup(@Valid @RequestBody LookupRequest r) {
        return ApiResponse.ok(map.booking(bookings.lookup(r.bookingCode(), r.email()), View.GUEST));
    }

    @PostMapping("/bookings/code/{code}/cancel")
    public ApiResponse<BookingDto> cancel(@PathVariable String code, @RequestParam(required = false) String key,
                                          @RequestBody(required = false) @Valid CancelRequest r, @AuthenticationPrincipal AuthUser me) {
        Booking b = bookings.cancelByGuest(code, key, me == null ? null : me.id(), r == null ? null : r.reason());
        return ApiResponse.ok(map.booking(b, View.GUEST), "Đã huỷ đơn đặt phòng", 200);
    }

    @GetMapping("/users/me/bookings")
    public ApiResponse<PageResponse<BookingDto>> mine(@AuthenticationPrincipal AuthUser me, @RequestParam(required = false) BookingStatus status,
                                                      @RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(PageResponse.of(bookings.mine(me.id(), status, Paging.of(page, size)), b -> map.bookingSummary(b, View.GUEST)));
    }
}
