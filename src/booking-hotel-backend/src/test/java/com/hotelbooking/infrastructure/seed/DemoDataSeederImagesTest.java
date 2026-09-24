package com.hotelbooking.infrastructure.seed;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;

/** F4: ảnh bìa dữ liệu mẫu là link CDN Unsplash, vừa cột VARCHAR(255) (hotels.cover_image_url, hotel_images.image_url). */
class DemoDataSeederImagesTest {

    @Test
    void coverImagesAreUnsplashCdnLinksWithinColumnSize() {
        assertThat(DemoDataSeeder.COVER_IMAGES)
                .containsOnlyKeys("ninh-kieu-riverside", "cai-rang-homestay", "vi-thanh-green", "sunset-bay", "mekong-lotus");
        assertThat(DemoDataSeeder.COVER_IMAGES.values()).allSatisfy(url -> {
            assertThat(url).startsWith("https://images.unsplash.com/photo-").endsWith("?auto=format&fit=crop&w=1200&q=75");
            assertThat(url.length()).isLessThanOrEqualTo(255);
        });
    }
}
