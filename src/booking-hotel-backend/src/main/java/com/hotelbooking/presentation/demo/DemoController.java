package com.hotelbooking.presentation.demo;

import com.hotelbooking.application.demo.DemoService;
import com.hotelbooking.infrastructure.security.AuthUser;
import com.hotelbooking.presentation.common.ApiResponse;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/demo")
public class DemoController {
    public record ClockRequest(long offsetMinutes) {}

    private final DemoService demo;

    public DemoController(DemoService demo) { this.demo = demo; }

    @GetMapping("/clock")
    public ApiResponse<DemoService.Clock> clock() { return ApiResponse.ok(demo.get()); }

    @PostMapping("/clock")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<DemoService.Clock> setClock(@RequestBody ClockRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(demo.set(r.offsetMinutes(), me.id()), "Đã dời đồng hồ nghiệp vụ", 200);
    }

    @PostMapping("/expire-now")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Map<String, Integer>> expireNow() { return ApiResponse.ok(Map.of("expired", demo.expireNow())); }
}
