package com.hotelbooking.presentation.notification;

import com.hotelbooking.application.notification.NotificationService;
import com.hotelbooking.infrastructure.security.AuthUser;
import com.hotelbooking.presentation.common.*;
import com.hotelbooking.presentation.common.Dtos.NotificationDto;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService notifications;
    private final DtoMapper map;

    public NotificationController(NotificationService notifications, DtoMapper map) {
        this.notifications = notifications;
        this.map = map;
    }

    @GetMapping
    public ApiResponse<PageResponse<NotificationDto>> list(@AuthenticationPrincipal AuthUser me, @RequestParam(required = false) Integer page,
                                                           @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(PageResponse.of(notifications.list(me.id(), Paging.of(page, size)), map::notification));
    }

    @GetMapping("/unread-count")
    public ApiResponse<Map<String, Long>> unread(@AuthenticationPrincipal AuthUser me) { return ApiResponse.ok(Map.of("count", notifications.unreadCount(me.id()))); }

    @PutMapping("/{id}/read")
    public ApiResponse<Void> read(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        notifications.markRead(me.id(), id);
        return ApiResponse.ok(null);
    }

    @PutMapping("/read-all")
    public ApiResponse<Void> readAll(@AuthenticationPrincipal AuthUser me) {
        notifications.markAllRead(me.id());
        return ApiResponse.ok(null);
    }
}
