package com.hotelbooking.presentation.portal;

import com.hotelbooking.application.booking.FrontDeskService;
import com.hotelbooking.domain.booking.BookingStatus;
import com.hotelbooking.infrastructure.security.AuthUser;
import com.hotelbooking.presentation.common.*;
import com.hotelbooking.presentation.common.DtoMapper.View;
import com.hotelbooking.presentation.common.Dtos.BookingDto;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Lễ tân: Owner + Staff trong phạm vi khách sạn (FR-BK-006/007). */
@RestController
@RequestMapping("/api/v1/portal/bookings")
public class PortalBookingController {
    /** roomId theo hợp đồng; roomIds (bổ sung) cho đơn nhiều phòng. */
    public record CheckInRequest(Long roomId, List<Long> roomIds) {
        List<Long> ids() {
            List<Long> out = new ArrayList<>();
            if (roomId != null) out.add(roomId);
            if (roomIds != null) roomIds.stream().filter(x -> x != null && !out.contains(x)).forEach(out::add);
            return out;
        }
    }

    private final FrontDeskService frontDesk;
    private final DtoMapper map;

    public PortalBookingController(FrontDeskService frontDesk, DtoMapper map) {
        this.frontDesk = frontDesk;
        this.map = map;
    }

    @GetMapping
    public ApiResponse<PageResponse<BookingDto>> search(@AuthenticationPrincipal AuthUser me, @RequestParam(required = false) Long hotelId,
                                                        @RequestParam(required = false) BookingStatus status,
                                                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                                        @RequestParam(required = false) String q,
                                                        @RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(PageResponse.of(frontDesk.search(me, hotelId, status, date, q, Paging.of(page, size)),
                b -> map.bookingSummary(b, View.STAFF)));
    }

    @GetMapping("/{id}")
    public ApiResponse<BookingDto> get(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.booking(frontDesk.get(me, id), View.STAFF));
    }

    @PostMapping("/{id}/check-in")
    public ApiResponse<BookingDto> checkIn(@PathVariable Long id, @RequestBody CheckInRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.booking(frontDesk.checkIn(me, id, r.ids()), View.STAFF), "Đã nhận phòng", 200);
    }

    @PostMapping("/{id}/check-out")
    public ApiResponse<BookingDto> checkOut(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.booking(frontDesk.checkOut(me, id), View.STAFF), "Đã trả phòng", 200);
    }

    @PostMapping("/{id}/no-show")
    public ApiResponse<BookingDto> noShow(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.booking(frontDesk.noShow(me, id), View.STAFF), "Đã ghi nhận khách không đến", 200);
    }
}
