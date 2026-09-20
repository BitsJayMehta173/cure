package com.medroute.repository;

import com.medroute.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * Unread-notification count for one patient — drives the badge shown
     * on the patient chooser in the Patient Records tab.
     */
    long countByPatientFkAndIsReadFalse(Long patientFk);

    /**
     * Bulk mark-as-read — called when the patient's records/gallery is opened.
     */
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.patientFk = :patientFk AND n.isRead = false")
    int markAllReadForPatient(@Param("patientFk") Long patientFk);
}
