package com.hotelbooking.presentation.review;

import com.hotelbooking.application.review.ReviewService;
import com.hotelbooking.infrastructure.security.AuthUser;
import com.hotelbooking.presentation.common.ApiResponse;
import com.hotelbooking.presentation.common.DtoMapper;
import com.hotelbooking.presentation.common.Dtos.ReviewDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class ReviewController {
    public record CreateReviewRequest(@NotBlank(message = "Thiếu mã đặt phòng") String bookingCode,
                                      @NotBlank(message = "Thiếu mã truy cập đơn") String key,
                                      @Min(value = 1, message = "Chấm từ 1 đến 5 sao") @Max(value = 5, message = "Chấm từ 1 đến 5 sao") int rating,
                                      @NotBlank @Size(min = 10, max = 2000, message = "Nội dung đánh giá từ 10 ký tự") String content) {}

    private final ReviewService reviews;
    private final DtoMapper map;

    public ReviewController(ReviewService reviews, DtoMapper map) {
        this.reviews = reviews;
        this.map = map;
    }

    @PostMapping("/reviews")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ReviewDto> create(@Valid @RequestBody CreateReviewRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.review(reviews.create(r.bookingCode(), r.key(), me == null ? null : me.id(), r.rating(), r.content())),
                "Cảm ơn bạn đã đánh giá", 201);
    }
}
