package com.hotelbooking.application.hotel;

import com.hotelbooking.application.audit.AuditService;
import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.hotel.Facility;
import com.hotelbooking.domain.hotel.FacilityCategory;
import com.hotelbooking.infrastructure.persistence.jpa.JpaFacilityCategoryRepository;
import com.hotelbooking.infrastructure.persistence.jpa.JpaFacilityRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** FR-ROOM-007: danh mục tiện nghi do admin quản lý. Đang được dùng → 409, không xoá. */
@Service
public class FacilityService {
    private final JpaFacilityCategoryRepository categories;
    private final JpaFacilityRepository facilities;
    private final AuditService audit;

    public FacilityService(JpaFacilityCategoryRepository categories, JpaFacilityRepository facilities, AuditService audit) {
        this.categories = categories;
        this.facilities = facilities;
        this.audit = audit;
    }

    @Transactional
    public FacilityCategory createCategory(String name, Long actorId) {
        if (categories.existsByNameIgnoreCase(name.trim())) throw BusinessException.conflict("Nhóm tiện nghi đã tồn tại");
        FacilityCategory c = categories.save(new FacilityCategory(name.trim()));
        audit.log(actorId, "CREATE", "facility_category", c.getId(), c.getName());
        return c;
    }

    @Transactional
    public FacilityCategory renameCategory(Long id, String name, Long actorId) {
        FacilityCategory c = categories.findById(id).orElseThrow(() -> BusinessException.notFound("nhóm tiện nghi"));
        c.rename(name.trim());
        audit.log(actorId, "UPDATE", "facility_category", id, name);
        return c;
    }

    @Transactional
    public void deleteCategory(Long id, Long actorId) {
        FacilityCategory c = categories.findById(id).orElseThrow(() -> BusinessException.notFound("nhóm tiện nghi"));
        if (facilities.countByCategoryId(id) > 0) throw BusinessException.conflict("Nhóm còn tiện nghi, hãy xoá tiện nghi trước");
        categories.delete(c);
        audit.log(actorId, "DELETE", "facility_category", id, c.getName());
    }

    @Transactional
    public Facility createFacility(Long categoryId, String name, String icon, Long actorId) {
        FacilityCategory c = categories.findById(categoryId).orElseThrow(() -> BusinessException.notFound("nhóm tiện nghi"));
        Facility f = facilities.save(new Facility(c, name.trim(), icon.trim()));
        audit.log(actorId, "CREATE", "facility", f.getId(), f.getName());
        return f;
    }

    @Transactional
    public Facility updateFacility(Long id, Long categoryId, String name, String icon, Long actorId) {
        Facility f = facilities.findById(id).orElseThrow(() -> BusinessException.notFound("tiện nghi"));
        FacilityCategory c = categories.findById(categoryId).orElseThrow(() -> BusinessException.notFound("nhóm tiện nghi"));
        f.update(c, name.trim(), icon.trim());
        audit.log(actorId, "UPDATE", "facility", id, name);
        return f;
    }

    @Transactional
    public void deleteFacility(Long id, Long actorId) {
        Facility f = facilities.findById(id).orElseThrow(() -> BusinessException.notFound("tiện nghi"));
        if (facilities.countUsage(id) > 0) throw BusinessException.conflict("Tiện nghi đang được gán cho loại phòng, chưa thể xoá");
        facilities.delete(f);
        audit.log(actorId, "DELETE", "facility", id, f.getName());
    }
}
