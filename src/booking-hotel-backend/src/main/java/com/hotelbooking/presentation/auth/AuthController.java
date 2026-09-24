package com.hotelbooking.presentation.auth;

import com.hotelbooking.application.auth.AuthService;
import com.hotelbooking.application.user.UserService;
import com.hotelbooking.infrastructure.security.AuthUser;
import com.hotelbooking.presentation.common.ApiResponse;
import com.hotelbooking.presentation.common.DtoMapper;
import com.hotelbooking.presentation.common.Dtos.AuthTokensDto;
import com.hotelbooking.presentation.common.Dtos.UserDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class AuthController {
    public record RegisterRequest(@NotBlank(message = "Vui lòng nhập họ tên") @Size(max = 120) String fullName,
                                  @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") String email,
                                  @NotBlank @Size(min = 8, max = 72, message = "Mật khẩu tối thiểu 8 ký tự") String password,
                                  @NotBlank(message = "Vui lòng nhập lại mật khẩu") String confirmPassword,
                                  @Pattern(regexp = "^$|^0\\d{9,10}$", message = "Số điện thoại không hợp lệ") String phone) {}
    public record LoginRequest(@NotBlank(message = "Vui lòng nhập email") String email, @NotBlank(message = "Vui lòng nhập mật khẩu") String password) {}
    public record RefreshRequest(@NotBlank String refreshToken) {}
    public record UpdateMeRequest(@NotBlank(message = "Vui lòng nhập họ tên") @Size(max = 120) String fullName,
                                  @Pattern(regexp = "^$|^0\\d{9,10}$", message = "Số điện thoại không hợp lệ") String phone) {}

    private final AuthService auth;
    private final UserService users;
    private final DtoMapper map;

    public AuthController(AuthService auth, UserService users, DtoMapper map) {
        this.auth = auth;
        this.users = users;
        this.map = map;
    }

    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<UserDto> register(@Valid @RequestBody RegisterRequest r) {
        return ApiResponse.ok(map.user(auth.register(r.fullName(), r.email(), r.password(), r.confirmPassword(), r.phone())),
                "Đăng ký thành công, vui lòng đăng nhập", 201);
    }

    @PostMapping("/auth/login")
    public ApiResponse<AuthTokensDto> login(@Valid @RequestBody LoginRequest r) { return ApiResponse.ok(tokens(auth.login(r.email(), r.password()))); }

    @PostMapping("/auth/refresh")
    public ApiResponse<AuthTokensDto> refresh(@Valid @RequestBody RefreshRequest r) { return ApiResponse.ok(tokens(auth.refresh(r.refreshToken()))); }

    @PostMapping("/auth/logout")
    public ApiResponse<Void> logout(@Valid @RequestBody RefreshRequest r) {
        auth.logout(r.refreshToken());
        return ApiResponse.ok(null, "Đã đăng xuất", 200);
    }

    @GetMapping("/users/me")
    public ApiResponse<UserDto> me(@AuthenticationPrincipal AuthUser me) { return ApiResponse.ok(map.user(users.get(me.id()))); }

    @PutMapping("/users/me")
    public ApiResponse<UserDto> updateMe(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody UpdateMeRequest r) {
        return ApiResponse.ok(map.user(users.updateMe(me.id(), r.fullName(), r.phone())));
    }

    private AuthTokensDto tokens(AuthService.Tokens t) {
        return new AuthTokensDto(t.accessToken(), t.refreshToken(), t.expiresIn(), map.user(t.user()));
    }
}
