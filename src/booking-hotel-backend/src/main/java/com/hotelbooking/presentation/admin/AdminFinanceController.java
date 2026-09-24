package com.hotelbooking.presentation.admin;

import com.hotelbooking.application.booking.BookingService;
import com.hotelbooking.application.payout.PayoutService;
import com.hotelbooking.domain.booking.BookingStatus;
import com.hotelbooking.domain.payout.PayoutStatus;
import com.hotelbooking.infrastructure.security.AuthUser;
import com.hotelbooking.presentation.common.*;
import com.hotelbooking.presentation.common.DtoMapper.View;
import com.hotelbooking.presentation.common.Dtos.BookingDto;
import com.hotelbooking.presentation.common.Dtos.PayoutDto;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Admin: toàn bộ đơn (chỉ xem) và payout cho khách sạn (FR-PO-004). Hoàn tiền ở PaymentController. */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminFinanceController {
    private final BookingService bookings;
    private final PayoutService payouts;
    private final DtoMapper map;

    public AdminFinanceController(BookingService bookings, PayoutService payouts, DtoMapper map) {
        this.bookings = bookings;
        this.payouts = payouts;
        this.map = map;
    }

    @GetMapping("/bookings")
    public ApiResponse<PageResponse<BookingDto>> bookings(@RequestParam(required = false) BookingStatus status, @RequestParam(required = false) Long hotelId,
                                                          @RequestParam(required = false) String keyword,
                                                          @RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(PageResponse.of(bookings.adminSearch(status, hotelId, keyword, Paging.of(page, size)), b -> map.bookingSummary(b, View.STAFF)));
    }

    @GetMapping("/bookings/{id}")
    public ApiResponse<BookingDto> booking(@PathVariable Long id) {
        return ApiResponse.ok(map.booking(bookings.adminGet(id), View.STAFF));
    }

    @GetMapping("/payouts")
    public ApiResponse<PageResponse<PayoutDto>> payouts(@RequestParam(required = false) PayoutStatus status,
                                                        @RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(PageResponse.of(payouts.search(status, Paging.of(page, size)), map::payout));
    }

    @PostMapping("/payouts/{id}/paid")
    public ApiResponse<PayoutDto> paid(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.payout(payouts.markPaid(id, me.id())), "Đã đánh dấu đã chuyển tiền", 200);
    }
}
