package com.hotelbooking.presentation.catalog;

import com.hotelbooking.application.hotel.CatalogService;
import com.hotelbooking.application.hotel.CatalogService.SearchFilter;
import com.hotelbooking.application.hotel.StayQuery;
import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.presentation.common.*;
import com.hotelbooking.presentation.common.Dtos.*;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

/** Customer Site công khai (FR-SRC-001/002/003). */
@RestController
@RequestMapping("/api/v1")
public class CatalogController {
    private final CatalogService catalog;
    private final DtoMapper map;

    public CatalogController(CatalogService catalog, DtoMapper map) {
        this.catalog = catalog;
        this.map = map;
    }

    @GetMapping("/hotels/search")
    public ApiResponse<PageResponse<HotelSummaryDto>> search(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut,
            @RequestParam(required = false) Integer guests, @RequestParam(required = false) Integer rooms,
            @RequestParam(required = false) Long minPrice, @RequestParam(required = false) Long maxPrice,
            @RequestParam(required = false) String stars, @RequestParam(required = false) String facilityIds,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        StayQuery q = StayQuery.of(checkIn, checkOut, guests, rooms, catalog.today());
        SearchFilter f = new SearchFilter(city, minPrice, maxPrice, csv(stars, Integer::valueOf), csv(facilityIds, Long::valueOf), sort);
        return ApiResponse.ok(PageResponse.of(catalog.search(q, f, Paging.of(page, size)), map::hotelSummary));
    }

    @GetMapping("/hotels/{id}")
    public ApiResponse<HotelDetailDto> detail(@PathVariable Long id,
                                              @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
                                              @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut,
                                              @RequestParam(required = false) Integer guests, @RequestParam(required = false) Integer rooms) {
        return ApiResponse.ok(map.hotelDetail(catalog.detail(id, StayQuery.of(checkIn, checkOut, guests, rooms, catalog.today()))));
    }

    @GetMapping("/hotels/{id}/reviews")
    public ApiResponse<PageResponse<ReviewDto>> reviews(@PathVariable Long id, @RequestParam(required = false) Integer page,
                                                        @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(PageResponse.of(catalog.reviews(id, Paging.of(page, size)), map::review));
    }

    @GetMapping("/cities")
    public ApiResponse<List<String>> cities() { return ApiResponse.ok(catalog.cities()); }

    @GetMapping("/facility-categories")
    public ApiResponse<List<FacilityCategoryDto>> facilityCategories() {
        return ApiResponse.ok(catalog.facilityCatalog().entrySet().stream().map(e -> map.category(e.getKey(), e.getValue())).toList());
    }

    private static <T> Set<T> csv(String raw, Function<String, T> parse) {
        if (raw == null || raw.isBlank()) return Set.of();
        try {
            return Arrays.stream(raw.split(",")).map(String::trim).filter(s -> !s.isEmpty()).map(parse).collect(Collectors.toSet());
        } catch (NumberFormatException e) {
            throw BusinessException.badRequest("Tham số danh sách phải là các số cách nhau bởi dấu phẩy");
        }
    }
}
