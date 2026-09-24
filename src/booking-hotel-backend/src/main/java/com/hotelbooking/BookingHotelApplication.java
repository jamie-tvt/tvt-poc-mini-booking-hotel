package com.hotelbooking;

import java.util.TimeZone;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BookingHotelApplication {
    public static void main(String[] args) {
        // JVM chạy UTC (giống container). "Hôm nay" nghiệp vụ luôn tính theo Asia/Ho_Chi_Minh qua BusinessDay.
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        SpringApplication.run(BookingHotelApplication.class, args);
    }
}
