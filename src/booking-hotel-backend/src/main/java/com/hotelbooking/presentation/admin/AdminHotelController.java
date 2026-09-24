package com.hotelbooking.presentation.admin;

import com.hotelbooking.application.hotel.AdminHotelService;
import com.hotelbooking.application.hotel.CatalogService;
import com.hotelbooking.application.hotel.FacilityService;
import com.hotelbooking.application.hotel.StayQuery;
import com.hotelbooking.domain.hotel.Hotel;
import com.hotelbooking.domain.hotel.HotelStatus;
import com.hotelbooking.infrastructure.security.AuthUser;
import com.hotelbooking.presentation.common.*;
import com.hotelbooking.presentation.common.Dtos.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Admin: duyệt khách sạn (FR-HTL-002) + danh mục tiện nghi (FR-ROOM-007). */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminHotelController {
    public record RejectRequest(@NotBlank(message = "Vui lòng nhập lý do") @Size(max = 255) String reason) {}
    public record CategoryRequest(@NotBlank(message = "Vui lòng nhập tên nhóm") @Size(max = 80) String name) {}
    public record FacilityRequest(@NotNull(message = "Vui lòng chọn nhóm") Long categoryId,
                                  @NotBlank(message = "Vui lòng nhập tên tiện nghi") @Size(max = 80) String name,
                                  @NotBlank(message = "Vui lòng nhập icon") @Size(max = 40) String icon) {}

    private final AdminHotelService hotels;
    private final FacilityService facilities;
    private final CatalogService catalog;
    private final DtoMapper map;

    public AdminHotelController(AdminHotelService hotels, FacilityService facilities, CatalogService catalog, DtoMapper map) {
        this.hotels = hotels;
        this.facilities = facilities;
        this.catalog = catalog;
        this.map = map;
    }

    @GetMapping("/hotels")
    public ApiResponse<PageResponse<HotelSummaryDto>> list(@RequestParam(required = false) HotelStatus status, @RequestParam(required = false) String keyword,
                                                           @RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        Page<Hotel> p = hotels.search(status, keyword, Paging.of(page, size));
        var offers = catalog.offersFor(p.getContent(), StayQuery.none(), null);
        return ApiResponse.ok(PageResponse.of(new PageImpl<>(offers, p.getPageable(), p.getTotalElements()), map::hotelSummary));
    }

    @GetMapping("/hotels/{id}")
    public ApiResponse<HotelDetailDto> get(@PathVariable Long id) { return ApiResponse.ok(detail(hotels.get(id))); }

    @PostMapping("/hotels/{id}/approve")
    public ApiResponse<HotelDetailDto> approve(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(detail(hotels.approve(id, me.id())), "Đã duyệt khách sạn", 200);
    }

    @PostMapping("/hotels/{id}/reject")
    public ApiResponse<HotelDetailDto> reject(@PathVariable Long id, @Valid @RequestBody RejectRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(detail(hotels.reject(id, me.id(), r.reason())), "Đã từ chối khách sạn", 200);
    }

    @PostMapping("/hotels/{id}/suspend")
    public ApiResponse<HotelDetailDto> suspend(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(detail(hotels.suspend(id, me.id())), "Đã tạm ngưng khách sạn", 200);
    }

    @PostMapping("/hotels/{id}/activate")
    public ApiResponse<HotelDetailDto> activate(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(detail(hotels.activate(id, me.id())), "Đã mở lại khách sạn", 200);
    }

    private HotelDetailDto detail(Hotel h) { return map.hotelDetail(catalog.offersFor(List.of(h), StayQuery.none(), null).get(0)); }

    // ------------------------------------------------------------ tiện nghi
    @GetMapping("/facility-categories")
    public ApiResponse<List<FacilityCategoryDto>> categories() {
        return ApiResponse.ok(catalog.facilityCatalog().entrySet().stream().map(e -> map.category(e.getKey(), e.getValue())).toList());
    }

    @PostMapping("/facility-categories")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<FacilityCategoryDto> createCategory(@Valid @RequestBody CategoryRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.category(facilities.createCategory(r.name(), me.id()), List.of()), "Đã tạo nhóm tiện nghi", 201);
    }

    @PutMapping("/facility-categories/{id}")
    public ApiResponse<FacilityCategoryDto> renameCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest r, @AuthenticationPrincipal AuthUser me) {
        var c = facilities.renameCategory(id, r.name(), me.id());
        var fs = catalog.facilityCatalog().entrySet().stream().filter(e -> e.getKey().getId().equals(c.getId()))
                .findFirst().map(java.util.Map.Entry::getValue).orElse(List.of());
        return ApiResponse.ok(map.category(c, fs));
    }

    @DeleteMapping("/facility-categories/{id}")
    public ApiResponse<Void> deleteCategory(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        facilities.deleteCategory(id, me.id());
        return ApiResponse.ok(null, "Đã xoá nhóm tiện nghi", 200);
    }

    @GetMapping("/facilities")
    public ApiResponse<List<FacilityDto>> facilityList() {
        return ApiResponse.ok(catalog.facilityCatalog().values().stream().flatMap(List::stream).map(map::facility).toList());
    }

    @PostMapping("/facilities")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<FacilityDto> createFacility(@Valid @RequestBody FacilityRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.facility(facilities.createFacility(r.categoryId(), r.name(), r.icon(), me.id())), "Đã tạo tiện nghi", 201);
    }

    @PutMapping("/facilities/{id}")
    public ApiResponse<FacilityDto> updateFacility(@PathVariable Long id, @Valid @RequestBody FacilityRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.facility(facilities.updateFacility(id, r.categoryId(), r.name(), r.icon(), me.id())));
    }

    @DeleteMapping("/facilities/{id}")
    public ApiResponse<Void> deleteFacility(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        facilities.deleteFacility(id, me.id());
        return ApiResponse.ok(null, "Đã xoá tiện nghi", 200);
    }
}
