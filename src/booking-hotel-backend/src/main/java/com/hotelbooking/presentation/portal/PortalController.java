package com.hotelbooking.presentation.portal;

import com.hotelbooking.application.hotel.CatalogService;
import com.hotelbooking.application.hotel.HotelCommands.HotelCommand;
import com.hotelbooking.application.hotel.HotelCommands.RoomTypeCommand;
import com.hotelbooking.application.hotel.HotelOffer;
import com.hotelbooking.application.hotel.PortalHotelService;
import com.hotelbooking.application.hotel.StayQuery;
import com.hotelbooking.application.payout.PayoutService;
import com.hotelbooking.domain.hotel.CancellationPolicy;
import com.hotelbooking.domain.hotel.Hotel;
import com.hotelbooking.domain.payout.PayoutStatus;
import com.hotelbooking.infrastructure.security.AuthUser;
import com.hotelbooking.presentation.common.*;
import com.hotelbooking.presentation.common.Dtos.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Hotel Portal — quản lý khách sạn/loại phòng/phòng/giá/nhân viên. Phạm vi khách sạn kiểm ở service (sai → 404). */
@RestController
@RequestMapping("/api/v1/portal")
public class PortalController {
    private static final String TIME = "^([01]\\d|2[0-3]):[0-5]\\d$";

    public record HotelRequest(@NotBlank(message = "Vui lòng nhập tên khách sạn") @Size(max = 160) String name,
                               @NotBlank(message = "Vui lòng nhập thành phố") @Size(max = 80) String city,
                               @NotBlank(message = "Vui lòng nhập địa chỉ") @Size(max = 255) String address,
                               @NotBlank(message = "Vui lòng nhập mô tả") @Size(max = 5000) String description,
                               @Min(value = 1, message = "Hạng sao từ 1 đến 5") @Max(value = 5, message = "Hạng sao từ 1 đến 5") int starRating,
                               @Pattern(regexp = "^$|^0\\d{9,10}$", message = "Số điện thoại không hợp lệ") String phone,
                               @NotBlank @Pattern(regexp = TIME, message = "Giờ nhận phòng dạng HH:mm") String checkInTime,
                               @NotBlank @Pattern(regexp = TIME, message = "Giờ trả phòng dạng HH:mm") String checkOutTime,
                               @Size(max = 255) String coverImageUrl) {
        HotelCommand toCommand() { return new HotelCommand(name, city, address, description, starRating, phone, checkInTime, checkOutTime, coverImageUrl); }
    }

    public record RoomTypeRequest(@NotBlank(message = "Vui lòng nhập tên loại phòng") @Size(max = 120) String name,
                                  @NotBlank(message = "Vui lòng nhập mô tả") @Size(max = 5000) String description,
                                  @Min(value = 1, message = "Sức chứa từ 1 khách") @Max(value = 20, message = "Sức chứa tối đa 20 khách") int capacity,
                                  @NotBlank(message = "Vui lòng nhập thông tin giường") @Size(max = 120) String bedInfo,
                                  @Min(value = 1, message = "Diện tích phải lớn hơn 0") @Max(10000) int areaM2,
                                  @Min(value = 1000, message = "Giá cơ bản tối thiểu 1.000đ") long basePrice,
                                  @NotNull(message = "Vui lòng chọn chính sách huỷ") CancellationPolicy cancellationPolicy,
                                  @Min(0) @Max(60) Integer freeCancelDays,
                                  @Size(max = 255) String imageUrl,
                                  List<Long> facilityIds) {
        RoomTypeCommand toCommand() {
            return new RoomTypeCommand(name, description, capacity, bedInfo, areaM2, basePrice, cancellationPolicy, freeCancelDays, imageUrl, facilityIds);
        }
    }

    public record RoomRequest(@NotBlank(message = "Vui lòng nhập số phòng") @Size(max = 10) String roomNumber) {}
    public record UpdateRoomRequest(@NotBlank(message = "Vui lòng nhập số phòng") @Size(max = 10) String roomNumber, @NotNull Boolean active) {}
    public record PriceRequest(@NotNull LocalDate from, @NotNull LocalDate to, @Min(value = 1000, message = "Giá tối thiểu 1.000đ") Long price) {}
    public record StaffRequest(@NotBlank(message = "Vui lòng nhập họ tên") @Size(max = 120) String fullName,
                               @NotBlank @Email(message = "Email không hợp lệ") String email,
                               @NotBlank @Size(min = 8, max = 72, message = "Mật khẩu tối thiểu 8 ký tự") String password,
                               @Pattern(regexp = "^$|^0\\d{9,10}$", message = "Số điện thoại không hợp lệ") String phone) {}
    public record ActiveRequest(@NotNull Boolean active) {}

    private final PortalHotelService portal;
    private final CatalogService catalog;
    private final PayoutService payouts;
    private final DtoMapper map;

    public PortalController(PortalHotelService portal, CatalogService catalog, PayoutService payouts, DtoMapper map) {
        this.portal = portal;
        this.catalog = catalog;
        this.payouts = payouts;
        this.map = map;
    }

    // ------------------------------------------------------------ khách sạn
    @GetMapping("/hotels")
    public ApiResponse<List<HotelSummaryDto>> hotels(@AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(catalog.offersFor(portal.myHotels(me), StayQuery.none(), null).stream().map(map::hotelSummary).toList());
    }

    @GetMapping("/hotels/{id}")
    public ApiResponse<HotelDetailDto> hotel(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(detail(portal.hotel(me, id)));
    }

    @PostMapping("/hotels")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('HOTEL_OWNER')")
    public ApiResponse<HotelDetailDto> createHotel(@Valid @RequestBody HotelRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(detail(portal.createHotel(me, r.toCommand())), "Đã gửi khách sạn chờ duyệt", 201);
    }

    @PutMapping("/hotels/{id}")
    @PreAuthorize("hasRole('HOTEL_OWNER')")
    public ApiResponse<HotelDetailDto> updateHotel(@PathVariable Long id, @Valid @RequestBody HotelRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(detail(portal.updateHotel(me, id, r.toCommand())), "Đã lưu hồ sơ khách sạn", 200);
    }

    private HotelDetailDto detail(Hotel h) { return map.hotelDetail(catalog.offersFor(List.of(h), StayQuery.none(), null).get(0)); }

    // ------------------------------------------------------------ loại phòng
    @GetMapping("/hotels/{id}/room-types")
    public ApiResponse<List<RoomTypeDto>> roomTypes(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        portal.roomTypes(me, id);
        HotelOffer o = catalog.offersFor(List.of(portal.hotel(me, id)), StayQuery.none(), null).get(0);
        return ApiResponse.ok(o.roomTypes().stream().map(map::roomType).toList());
    }

    @PostMapping("/hotels/{id}/room-types")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('HOTEL_OWNER')")
    public ApiResponse<RoomTypeDto> createRoomType(@PathVariable Long id, @Valid @RequestBody RoomTypeRequest r, @AuthenticationPrincipal AuthUser me) {
        var t = portal.createRoomType(me, id, r.toCommand());
        return ApiResponse.ok(roomTypeDto(me, t.getHotel().getId(), t.getId()), "Đã tạo loại phòng", 201);
    }

    @PutMapping("/room-types/{id}")
    @PreAuthorize("hasRole('HOTEL_OWNER')")
    public ApiResponse<RoomTypeDto> updateRoomType(@PathVariable Long id, @Valid @RequestBody RoomTypeRequest r, @AuthenticationPrincipal AuthUser me) {
        var t = portal.updateRoomType(me, id, r.toCommand());
        return ApiResponse.ok(roomTypeDto(me, t.getHotel().getId(), t.getId()), "Đã lưu loại phòng", 200);
    }

    @DeleteMapping("/room-types/{id}")
    @PreAuthorize("hasRole('HOTEL_OWNER')")
    public ApiResponse<Void> deleteRoomType(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        portal.deleteRoomType(me, id);
        return ApiResponse.ok(null, "Đã xoá loại phòng", 200);
    }

    @PutMapping("/room-types/{id}/prices")
    @PreAuthorize("hasRole('HOTEL_OWNER')")
    public ApiResponse<Map<String, Integer>> prices(@PathVariable Long id, @Valid @RequestBody PriceRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(Map.of("updatedNights", portal.setPrices(me, id, r.from(), r.to(), r.price())), "Đã cập nhật giá theo ngày", 200);
    }

    private RoomTypeDto roomTypeDto(AuthUser me, Long hotelId, Long roomTypeId) {
        HotelOffer o = catalog.offersFor(List.of(portal.hotel(me, hotelId)), StayQuery.none(), null).get(0);
        return o.roomTypes().stream().filter(x -> x.roomType().getId().equals(roomTypeId)).findFirst().map(map::roomType).orElseThrow();
    }

    // ------------------------------------------------------------ phòng
    /** ≠ hợp đồng: Staff cũng GET được (lễ tân cần chọn phòng khi check-in). */
    @GetMapping("/room-types/{id}/rooms")
    public ApiResponse<List<RoomDto>> rooms(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(portal.rooms(me, id).stream().map(v -> map.room(v.room(), v.occupied())).toList());
    }

    @PostMapping("/room-types/{id}/rooms")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('HOTEL_OWNER')")
    public ApiResponse<RoomDto> addRoom(@PathVariable Long id, @Valid @RequestBody RoomRequest r, @AuthenticationPrincipal AuthUser me) {
        var v = portal.addRoom(me, id, r.roomNumber());
        return ApiResponse.ok(map.room(v.room(), v.occupied()), "Đã thêm phòng", 201);
    }

    @PutMapping("/rooms/{id}")
    @PreAuthorize("hasRole('HOTEL_OWNER')")
    public ApiResponse<RoomDto> updateRoom(@PathVariable Long id, @Valid @RequestBody UpdateRoomRequest r, @AuthenticationPrincipal AuthUser me) {
        var v = portal.updateRoom(me, id, r.roomNumber(), r.active());
        return ApiResponse.ok(map.room(v.room(), v.occupied()), "Đã lưu phòng", 200);
    }

    // ------------------------------------------------------------ nhân viên
    @GetMapping("/hotels/{id}/staff")
    @PreAuthorize("hasRole('HOTEL_OWNER')")
    public ApiResponse<List<UserDto>> staff(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(portal.staff(me, id).stream().map(map::user).toList());
    }

    @PostMapping("/hotels/{id}/staff")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('HOTEL_OWNER')")
    public ApiResponse<UserDto> createStaff(@PathVariable Long id, @Valid @RequestBody StaffRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.user(portal.createStaff(me, id, r.fullName(), r.email(), r.password(), r.phone())), "Đã tạo tài khoản nhân viên", 201);
    }

    @PutMapping("/staff/{id}/active")
    @PreAuthorize("hasRole('HOTEL_OWNER')")
    public ApiResponse<UserDto> staffActive(@PathVariable Long id, @Valid @RequestBody ActiveRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.user(portal.setStaffActive(me, id, r.active())), r.active() ? "Đã mở khoá" : "Đã khoá tài khoản", 200);
    }

    // ------------------------------------------------------------ payout
    @GetMapping("/payouts")
    @PreAuthorize("hasRole('HOTEL_OWNER')")
    public ApiResponse<PageResponse<PayoutDto>> payouts(@AuthenticationPrincipal AuthUser me, @RequestParam(required = false) Long hotelId,
                                                        @RequestParam(required = false) PayoutStatus status,
                                                        @RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(PageResponse.of(payouts.forOwner(me, hotelId, status, Paging.of(page, size)), map::payout));
    }
}
