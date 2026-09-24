package com.hotelbooking.presentation.admin;

import com.hotelbooking.application.admin.DashboardService;
import com.hotelbooking.application.audit.AuditService;
import com.hotelbooking.application.systemsetting.SettingService;
import com.hotelbooking.application.user.UserService;
import com.hotelbooking.domain.user.Role;
import com.hotelbooking.infrastructure.security.AuthUser;
import com.hotelbooking.presentation.common.*;
import com.hotelbooking.presentation.common.DtoMapper.View;
import com.hotelbooking.presentation.common.Dtos.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Admin Panel: dashboard, tài khoản (FR-USR-002), cấu hình (FR-FEE), nhật ký. Chỉ ADMIN (SecurityConfig). */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {
    public record CreateUserRequest(@NotBlank(message = "Vui lòng nhập họ tên") @Size(max = 120) String fullName,
                                    @NotBlank @Email(message = "Email không hợp lệ") String email,
                                    @NotBlank @Size(min = 8, max = 72, message = "Mật khẩu tối thiểu 8 ký tự") String password,
                                    @Pattern(regexp = "^$|^0\\d{9,10}$", message = "Số điện thoại không hợp lệ") String phone,
                                    @NotNull Role role, Long hotelId) {}
    public record UpdateUserRequest(@NotBlank @Size(max = 120) String fullName,
                                    @Pattern(regexp = "^$|^0\\d{9,10}$", message = "Số điện thoại không hợp lệ") String phone,
                                    @NotNull Role role, Long hotelId) {}
    public record ActiveRequest(@NotNull Boolean active) {}
    public record SettingsRequest(@NotEmpty List<@Valid Item> items) {
        public record Item(@NotBlank String key, @NotBlank String value) {}
    }
    public record DashboardDto(Map<String, Long> hotels, Map<String, Long> bookings, Map<String, Long> revenue,
                               Map<String, Long> occupancyTonight, Map<String, Long> users, List<BookingDto> recentBookings) {}

    private final UserService users;
    private final SettingService settings;
    private final DashboardService dashboard;
    private final AuditService audit;
    private final DtoMapper map;

    public AdminController(UserService users, SettingService settings, DashboardService dashboard, AuditService audit, DtoMapper map) {
        this.users = users;
        this.settings = settings;
        this.dashboard = dashboard;
        this.audit = audit;
        this.map = map;
    }

    @GetMapping("/dashboard")
    public ApiResponse<DashboardDto> dashboard() {
        var d = dashboard.build();
        return ApiResponse.ok(new DashboardDto(d.hotels(), d.bookings(), d.revenue(), d.occupancyTonight(), d.users(),
                d.recentBookings().stream().map(b -> map.bookingSummary(b, View.STAFF)).toList()));
    }

    @GetMapping("/users")
    public ApiResponse<PageResponse<UserDto>> users(@RequestParam(required = false) String keyword, @RequestParam(required = false) Role role,
                                                    @RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(PageResponse.of(users.search(keyword, role, Paging.of(page, size)), map::user));
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<UserDto> create(@Valid @RequestBody CreateUserRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.user(users.create(r.fullName(), r.email(), r.password(), r.phone(), r.role(), r.hotelId(), me.id())),
                "Đã tạo tài khoản", 201);
    }

    @PutMapping("/users/{id}")
    public ApiResponse<UserDto> update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.user(users.update(id, r.fullName(), r.phone(), r.role(), r.hotelId(), me.id())));
    }

    @PutMapping("/users/{id}/active")
    public ApiResponse<UserDto> active(@PathVariable Long id, @Valid @RequestBody ActiveRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.user(users.setActive(id, r.active(), me.id())), r.active() ? "Đã mở khoá" : "Đã khoá tài khoản", 200);
    }

    @GetMapping("/settings")
    public ApiResponse<List<SettingDto>> settings() { return ApiResponse.ok(settings.list().stream().map(map::setting).toList()); }

    @PutMapping("/settings")
    public ApiResponse<List<SettingDto>> updateSettings(@Valid @RequestBody SettingsRequest r, @AuthenticationPrincipal AuthUser me) {
        Map<String, String> values = new LinkedHashMap<>();
        r.items().forEach(i -> values.put(i.key(), i.value()));
        settings.update(values, me.id());
        return ApiResponse.ok(settings.list().stream().map(map::setting).toList(), "Đã lưu cấu hình", 200);
    }

    @GetMapping("/audit-logs")
    public ApiResponse<PageResponse<AuditLogDto>> audit(@RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(PageResponse.of(audit.list(Paging.of(page, size == null ? 30 : size)), map::audit));
    }
}
