package com.medroute;

import com.medroute.entity.*;
import com.medroute.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@SpringBootApplication
public class MedRouteApplication {

    public static void main(String[] args) {
        SpringApplication.run(MedRouteApplication.class, args);
    }

    @Bean
    CommandLineRunner seedDatabase(
            HospitalRepository hospitalRepo,
            HospitalDepartmentRepository deptRepo,
            DoctorRepository doctorRepo,
            AppointmentRepository apptRepo,
            HolidayRepository holidayRepo,
            MedicalReportRepository reportRepo,
            PrescriptionRepository prescriptionRepo,
            NotificationRepository notificationRepo,
            JdbcTemplate jdbc) {
        return args -> {
            // 1. Always ensure pg_trgm is enabled and the search index exists.
            //    These are idempotent so it's safe to run on every startup.
            try {
                jdbc.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm");
                jdbc.execute("CREATE INDEX IF NOT EXISTS doctor_name_trgm_idx ON doctor USING gin (doctor_name gin_trgm_ops)");
                jdbc.execute("ALTER TABLE doctor ALTER COLUMN photo_url TYPE TEXT");
                System.out.println("🔍 pg_trgm extension, doctor_name index, and photo_url TEXT ready.");
            } catch (Exception e) {
                System.out.println("⚠️  Could not ensure pg_trgm index or photo_url TEXT: " + e.getMessage());
            }

            // 2. If DB is empty, full seed. If populated, backfill new Doctor Directory columns
            //    (photoUrl, bio) on existing doctors so the directory has data to display.
            if (hospitalRepo.count() > 0) {
                System.out.println("✅ Database already seeded. Backfilling Doctor Directory fields on existing doctors...");
                int updated = 0;
                for (Doctor doc : doctorRepo.findAllWithDepartment()) {
                    if (doc.getPhotoUrl() == null || doc.getPhotoUrl().isBlank()
                        || doc.getBio() == null || doc.getBio().isBlank()) {
                        String name = doc.getDoctorName();
                        doc.setPhotoUrl("https://ui-avatars.com/api/?name="
                                + name.replace("Dr. ", "").replace(" ", "+")
                                + "&background=4F46E5&color=fff&size=240&font-size=0.4&bold=true");
                        var dept = doc.getDepartment();
                        String deptName = dept.getDepartmentName();
                        doc.setBio(String.format(
                            "Dr. %s is a %s specialist at %s with %d years of clinical experience. "
                            + "Having treated over %,d patients, %s brings a patient-first approach "
                            + "to %s care and is known for clear communication and evidence-based treatment plans.",
                            name.replace("Dr. ", ""), deptName, dept.getHospital().getName(),
                            doc.getYearsOfExperience() != null ? doc.getYearsOfExperience() : 0,
                            doc.getTotalPatientsTreated() != null ? doc.getTotalPatientsTreated() : 0,
                            name.replace("Dr. ", ""), deptName
                        ));
                        doctorRepo.save(doc);
                        updated++;
                    }
                }
                System.out.println("🩺 Backfilled Doctor Directory fields on " + updated + " doctors.");

                backfillPatientRecords(apptRepo, reportRepo, prescriptionRepo, notificationRepo);
                return;
            }

            System.out.println("🌱 Seeding MedRoute database with realistic data...");

            // ─── RAJASTHAN ────────────────────────────────────────────────
            Hospital h1 = saveHospital(hospitalRepo, "SMS Hospital Jaipur", "Sawai Man Singh Rd, Jaipur", "Rajasthan",
                    26.9015, 75.8002, "government", 4.5, "8:00 AM - 4:00 PM", "NABH,NABL");
            HospitalDepartment d1 = saveDept(deptRepo, h1, "Cardiology");
            saveDoctor(doctorRepo, d1, "Dr. Kavita Sharma", "MBBS, MD (Specialist)", 20, 12, 18200, 10);
            saveDoctor(doctorRepo, d1, "Dr. Rahul Mehta", "MBBS, MD (Specialist)", 15, 20, 9800,  15);
            HospitalDepartment d2 = saveDept(deptRepo, h1, "Oncology");
            saveDoctor(doctorRepo, d2, "Dr. Priya Singh", "MBBS, MD (Specialist)", 22, 15, 14500, 12);
            saveDoctor(doctorRepo, d2, "Dr. Anil Gupta", "MBBS, MD (Specialist)", 8, 18, 4200,  20);

            Hospital h2 = saveHospital(hospitalRepo, "Fortis Hospital Jaipur", "Jawahar Lal Nehru Marg, Jaipur", "Rajasthan",
                    26.8700, 75.8200, "private", 4.8, "9:00 AM - 6:00 PM", "NABH,JCI");
            HospitalDepartment d3 = saveDept(deptRepo, h2, "Cardiology");
            saveDoctor(doctorRepo, d3, "Dr. Sunita Agarwal", "MBBS, MD (Specialist)", 17, 16, 11200, 10);
            saveDoctor(doctorRepo, d3, "Dr. Vikas Joshi", "MBBS, MD (Specialist)", 5, 22, 2100,  25);
            HospitalDepartment d4 = saveDept(deptRepo, h2, "Neurology");
            saveDoctor(doctorRepo, d4, "Dr. Pooja Choudhary", "MBBS, MD (Specialist)", 12, 14, 7800,  18);
            saveDoctor(doctorRepo, d4, "Dr. Deepak Verma", "MBBS, MD (Specialist)", 20, 18, 16200, 10);

            Hospital h3 = saveHospital(hospitalRepo, "AIIMS Jodhpur", "Basni Industrial Area, Jodhpur", "Rajasthan",
                    26.2481, 72.9992, "government", 4.7, "9:00 AM - 3:00 PM", "NABH");
            HospitalDepartment d5 = saveDept(deptRepo, h3, "Cardiology");
            saveDoctor(doctorRepo, d5, "Dr. Ramesh Pareek", "MBBS, MD (Specialist)", 25, 14, 22000,  8);
            HospitalDepartment d6 = saveDept(deptRepo, h3, "Oncology");
            saveDoctor(doctorRepo, d6, "Dr. Meena Rathore", "MBBS, MD (Specialist)", 18, 12, 13500, 12);
            saveDoctor(doctorRepo, d6, "Dr. Suresh Patel", "MBBS, MD (Specialist)", 6, 16, 3200,  20);

            // ─── DELHI NCR ────────────────────────────────────────────────
            Hospital h4 = saveHospital(hospitalRepo, "AIIMS New Delhi", "Sri Aurobindo Marg, New Delhi", "Delhi NCR",
                    28.5672, 77.2100, "government", 4.9, "9:00 AM - 1:00 PM", "NABH,NABL,JCI");
            HospitalDepartment d7 = saveDept(deptRepo, h4, "Cardiology");
            saveDoctor(doctorRepo, d7, "Dr. Rajan Kapoor", "MBBS, MD (Specialist)", 30, 12, 31000,  8);
            saveDoctor(doctorRepo, d7, "Dr. Anjali Sood", "MBBS, MD (Specialist)", 20, 20, 18400, 10);
            HospitalDepartment d8 = saveDept(deptRepo, h4, "Oncology");
            saveDoctor(doctorRepo, d8, "Dr. Vivek Malhotra", "MBBS, MD (Specialist)", 25, 14, 24500,  8);
            saveDoctor(doctorRepo, d8, "Dr. Nisha Arora", "MBBS, MD (Specialist)", 12, 18, 9100,  15);
            HospitalDepartment d9 = saveDept(deptRepo, h4, "Neurology");
            saveDoctor(doctorRepo, d9, "Dr. Amit Bansal", "MBBS, MD (Specialist)", 18, 16, 14200, 12);

            Hospital h5 = saveHospital(hospitalRepo, "Apollo Delhi", "Sarita Vihar, New Delhi", "Delhi NCR",
                    28.5421, 77.2858, "private", 4.6, "8:00 AM - 8:00 PM", "JCI,NABH");
            HospitalDepartment d10 = saveDept(deptRepo, h5, "Cardiology");
            saveDoctor(doctorRepo, d10, "Dr. Rahul Jain", "MBBS, MD (Specialist)", 10, 20, 6800,  15);
            saveDoctor(doctorRepo, d10, "Dr. Sheetal Grover", "MBBS, MD (Specialist)", 3, 24, 1200,  25);
            HospitalDepartment d11 = saveDept(deptRepo, h5, "Orthopedics");
            saveDoctor(doctorRepo, d11, "Dr. Manish Kumar", "MBBS, MD (Specialist)", 16, 18, 12300, 12);
            saveDoctor(doctorRepo, d11, "Dr. Rekha Goel", "MBBS, MD (Specialist)", 22, 14, 17800, 10);

            Hospital h6 = saveHospital(hospitalRepo, "Max Hospital Gurgaon", "Sushant Lok, Gurgaon", "Delhi NCR",
                    28.4736, 77.0952, "private", 4.5, "9:00 AM - 7:00 PM", "NABH");
            HospitalDepartment d12 = saveDept(deptRepo, h6, "Oncology");
            saveDoctor(doctorRepo, d12, "Dr. Sanjay Luthra", "MBBS, MD (Specialist)", 20, 15, 17200, 10);
            HospitalDepartment d13 = saveDept(deptRepo, h6, "Neurology");
            saveDoctor(doctorRepo, d13, "Dr. Aarti Mishra", "MBBS, MD (Specialist)", 9, 20, 5600,  20);
            saveDoctor(doctorRepo, d13, "Dr. Kiran Bhatia", "MBBS, MD (Specialist)", 15, 16, 10800, 15);

            // ─── MAHARASHTRA ──────────────────────────────────────────────
            Hospital h7 = saveHospital(hospitalRepo, "KEM Hospital Mumbai", "Acharya Donde Marg, Mumbai", "Maharashtra",
                    19.0033, 72.8404, "government", 4.6, "8:00 AM - 2:00 PM", "NABH");
            HospitalDepartment d14 = saveDept(deptRepo, h7, "Cardiology");
            saveDoctor(doctorRepo, d14, "Dr. Suhas Kulkarni", "MBBS, MD (Specialist)", 28, 16, 26000,  8);
            saveDoctor(doctorRepo, d14, "Dr. Priti Deshpande", "MBBS, MD (Specialist)", 14, 22, 9400,  15);
            HospitalDepartment d15 = saveDept(deptRepo, h7, "Oncology");
            saveDoctor(doctorRepo, d15, "Dr. Vijay Mhatre", "MBBS, MD (Specialist)", 20, 14, 18500, 10);
            saveDoctor(doctorRepo, d15, "Dr. Smita Joshi", "MBBS, MD (Specialist)", 7, 18, 3800,  20);

            Hospital h8 = saveHospital(hospitalRepo, "Kokilaben Hospital Mumbai", "Rao Saheb Achutrao Patwardhan Marg, Mumbai", "Maharashtra",
                    19.1196, 72.8285, "private", 4.7, "9:00 AM - 6:00 PM", "NABH,JCI");
            HospitalDepartment d16 = saveDept(deptRepo, h8, "Cardiology");
            saveDoctor(doctorRepo, d16, "Dr. Rajiv Nanda", "MBBS, MD (Specialist)", 23, 14, 20100, 10);
            HospitalDepartment d17 = saveDept(deptRepo, h8, "Neurology");
            saveDoctor(doctorRepo, d17, "Dr. Aditi Wadia", "MBBS, MD (Specialist)", 16, 18, 12000, 15);
            saveDoctor(doctorRepo, d17, "Dr. Girish Tambe", "MBBS, MD (Specialist)", 10, 20, 6200,  20);

            Hospital h9 = saveHospital(hospitalRepo, "Ruby Hall Clinic Pune", "Sassoon Rd, Pune", "Maharashtra",
                    18.5196, 73.8765, "trust", 4.4, "8:00 AM - 8:00 PM", "NABH");
            HospitalDepartment d18 = saveDept(deptRepo, h9, "Orthopedics");
            saveDoctor(doctorRepo, d18, "Dr. Sachin Bhosale", "MBBS, MD (Specialist)", 20, 20, 16800, 10);
            saveDoctor(doctorRepo, d18, "Dr. Varsha Patil", "MBBS, MD (Specialist)", 12, 24, 7400,  15);
            HospitalDepartment d19 = saveDept(deptRepo, h9, "Oncology");
            saveDoctor(doctorRepo, d19, "Dr. Rajesh Joshi", "MBBS, MD (Specialist)", 18, 15, 13900, 12);

            // ─── KARNATAKA ────────────────────────────────────────────────
            Hospital h10 = saveHospital(hospitalRepo, "Manipal Hospital Bangalore", "HAL Airport Rd, Bangalore", "Karnataka",
                    12.9562, 77.6406, "trust", 4.6, "8:00 AM - 8:00 PM", "NABH,NABL");
            HospitalDepartment d20 = saveDept(deptRepo, h10, "Cardiology");
            saveDoctor(doctorRepo, d20, "Dr. Krishnaraj Pai", "MBBS, MD (Specialist)", 26, 14, 23500,  8);
            saveDoctor(doctorRepo, d20, "Dr. Divya Shenoy", "MBBS, MD (Specialist)", 15, 20, 10800, 12);
            HospitalDepartment d21 = saveDept(deptRepo, h10, "Oncology");
            saveDoctor(doctorRepo, d21, "Dr. Prasad Rao", "MBBS, MD (Specialist)", 19, 16, 15200, 10);
            HospitalDepartment d22 = saveDept(deptRepo, h10, "Neurology");
            saveDoctor(doctorRepo, d22, "Dr. Suma Nair", "MBBS, MD (Specialist)", 12, 18, 8900,  15);
            saveDoctor(doctorRepo, d22, "Dr. Suresh Babu", "MBBS, MD (Specialist)", 6, 22, 2800,  25);

            Hospital h11 = saveHospital(hospitalRepo, "Narayana Health Bangalore", "Bommasandra, Bangalore", "Karnataka",
                    12.8121, 77.6908, "trust", 4.3, "8:00 AM - 6:00 PM", "NABH");
            HospitalDepartment d23 = saveDept(deptRepo, h11, "Cardiology");
            saveDoctor(doctorRepo, d23, "Dr. Devi Shetty Jr.", "MBBS, MD (Specialist)", 22, 16, 19800, 10);
            HospitalDepartment d24 = saveDept(deptRepo, h11, "Orthopedics");
            saveDoctor(doctorRepo, d24, "Dr. Latha Subramaniam", "MBBS, MD (Specialist)", 17, 20, 13200, 12);
            saveDoctor(doctorRepo, d24, "Dr. Harish Gowda", "MBBS, MD (Specialist)", 8, 24, 4500,  20);

            // ─── TAMIL NADU ───────────────────────────────────────────────
            Hospital h12 = saveHospital(hospitalRepo, "Apollo Hospitals Chennai", "Greams Rd, Chennai", "Tamil Nadu",
                    13.0606, 80.2536, "private", 4.8, "7:00 AM - 9:00 PM", "JCI,NABH,NABL");
            HospitalDepartment d25 = saveDept(deptRepo, h12, "Cardiology");
            saveDoctor(doctorRepo, d25, "Dr. M. Ravindran", "MBBS, MD (Specialist)", 28, 14, 25600,  8);
            saveDoctor(doctorRepo, d25, "Dr. Nalini Iyer", "MBBS, MD (Specialist)", 16, 20, 12100, 12);
            HospitalDepartment d26 = saveDept(deptRepo, h12, "Oncology");
            saveDoctor(doctorRepo, d26, "Dr. Krishnaswamy T.", "MBBS, MD (Specialist)", 24, 15, 21200, 10);
            HospitalDepartment d27 = saveDept(deptRepo, h12, "Neurology");
            saveDoctor(doctorRepo, d27, "Dr. Prabhavathi G.", "MBBS, MD (Specialist)", 18, 18, 14600, 12);
            saveDoctor(doctorRepo, d27, "Dr. Selvaraj K.", "MBBS, MD (Specialist)", 10, 22, 6400,  18);

            Hospital h13 = saveHospital(hospitalRepo, "MIOT International Chennai", "Mount Poonamallee Rd, Chennai", "Tamil Nadu",
                    13.0345, 80.1682, "private", 4.7, "8:00 AM - 8:00 PM", "NABH,JCI");
            HospitalDepartment d28 = saveDept(deptRepo, h13, "Orthopedics");
            saveDoctor(doctorRepo, d28, "Dr. Arun Muthu", "MBBS, MD (Specialist)", 20, 18, 17400, 10);
            saveDoctor(doctorRepo, d28, "Dr. Chitra Rajan", "MBBS, MD (Specialist)", 12, 22, 8100,  15);
            HospitalDepartment d29 = saveDept(deptRepo, h13, "Cardiology");
            saveDoctor(doctorRepo, d29, "Dr. Venkataraman S.", "MBBS, MD (Specialist)", 15, 16, 11200, 15);

            
            // Patient profiles are created at signup (via AuthController).
            // They are NOT seeded here since every Patient must belong to a UserAccount.

            System.out.println("📅 Seeding Holidays...");
            // National holidays
            saveHoliday(holidayRepo, 2026, 1, 26, "Republic Day", null);
            saveHoliday(holidayRepo, 2026, 3, 14, "Holi", null);
            saveHoliday(holidayRepo, 2026, 8, 15, "Independence Day", null);
            saveHoliday(holidayRepo, 2026, 10, 2, "Gandhi Jayanti", null);
            saveHoliday(holidayRepo, 2026, 11, 4, "Diwali", null);
            saveHoliday(holidayRepo, 2026, 11, 5, "Bhai Dooj", null);
            saveHoliday(holidayRepo, 2026, 12, 25, "Christmas", null);
            // State-specific holidays
            saveHoliday(holidayRepo, 2026, 1, 14, "Pongal", "Tamil Nadu");
            saveHoliday(holidayRepo, 2026, 3, 17, "Good Friday", "Karnataka");
            saveHoliday(holidayRepo, 2026, 4, 14, "Tamil New Year", "Tamil Nadu");
            saveHoliday(holidayRepo, 2026, 4, 15, "Dr. Ambedkar Jayanti", "Maharashtra");
            saveHoliday(holidayRepo, 2026, 6, 1, "Maharashtra Day", "Maharashtra");
            saveHoliday(holidayRepo, 2026, 8, 16, "Raksha Bandhan", "Rajasthan");
            saveHoliday(holidayRepo, 2026, 11, 1, "Karnataka Rajyotsava", "Karnataka");

            System.out.println("🤖 Running Patient Traffic Simulator...");
            java.util.Random random = new java.util.Random(42); // deterministic seed
            java.time.LocalDate today = java.time.LocalDate.now();

            for (Doctor doc : doctorRepo.findAllWithDepartment()) {
                // Denormalized IDs for fast wizard queries
                var dept = doc.getDepartment();
                Long hospitalId = dept.getHospital().getId();
                Long departmentId = dept.getId();

                // Randomly decide how busy this doctor is (0 to 14 days fully booked, plus a partially booked day)
                int fullyBookedDays = random.nextInt(15);

                for (int d = 0; d < fullyBookedDays; d++) {
                    java.time.LocalDate simDate = today.plusDays(d);
                    for (int t = 1; t <= doc.getDailyLimit(); t++) {
                        Appointment a = new Appointment();
                        a.setDoctor(doc);
                        a.setDateStr(simDate.toString());
                        a.setPatientName("Simulated Patient " + t);
                        a.setTokenCode("SIM-" + doc.getId() + "-" + simDate.toString() + "-" + t);
                        a.setTokenNum(t);
                        a.setSource("Simulator");
                        a.setStatus("confirmed");
                        a.setHospitalId(hospitalId);
                        a.setDepartmentId(departmentId);
                        apptRepo.save(a);
                    }
                }

                // Partially book the next day
                java.time.LocalDate partialDate = today.plusDays(fullyBookedDays);
                int partialTokens = random.nextInt(doc.getDailyLimit());
                for (int t = 1; t <= partialTokens; t++) {
                    Appointment a = new Appointment();
                    a.setDoctor(doc);
                    a.setDateStr(partialDate.toString());
                    a.setPatientName("Simulated Patient " + t);
                    a.setTokenCode("SIM-" + doc.getId() + "-" + partialDate.toString() + "-" + t);
                    a.setTokenNum(t);
                    a.setSource("Simulator");
                    a.setStatus("confirmed");
                    a.setHospitalId(hospitalId);
                    a.setDepartmentId(departmentId);
                    apptRepo.save(a);
                }
            }

            System.out.println("✅ Database seeded! Hospitals: " + hospitalRepo.count() +
                               ", Doctors: " + doctorRepo.count() + ", Appointments: " + apptRepo.count());

        };
    }

    private Hospital saveHospital(HospitalRepository repo, String name, String address, String state,
                                double lat, double lon, String type, Double rating, String opdHours, String accreditation) {
        Hospital h = new Hospital();
        h.setName(name); h.setAddress(address); h.setState(state);
        h.setLatitude(lat); h.setLongitude(lon);
        h.setType(type); h.setRating(rating); h.setOpdHours(opdHours); h.setAccreditation(accreditation);
        return repo.save(h);
    }

    private HospitalDepartment saveDept(HospitalDepartmentRepository repo, Hospital hospital, String deptName) {
        HospitalDepartment d = new HospitalDepartment();
        d.setHospital(hospital); d.setDepartmentName(deptName);
        return repo.save(d);
    }

    private void saveHoliday(HolidayRepository repo, int year, int month, int day, String name, String state) {
        Holiday h = new Holiday(LocalDate.of(year, month, day), name, state);
        repo.save(h);
    }

    private void saveDoctor(DoctorRepository repo, HospitalDepartment dept, String name,
                            String qualification, int yearsExp, int dailyLimit, int totalPatients, int avgMins) {
        Doctor d = new Doctor();
        d.setDepartment(dept); d.setDoctorName(name); d.setDailyLimit(dailyLimit);
        d.setQualification(qualification); d.setYearsOfExperience(yearsExp); d.setTotalPatientsTreated(totalPatients); d.setAvgMinutesPerPatient(avgMins);
        // Doctor Directory fields: use ui-avatars.com for placeholder portraits,
        // and a templated bio for display on the profile page.
        d.setPhotoUrl("https://ui-avatars.com/api/?name=" + name.replace("Dr. ", "").replace(" ", "+")
                + "&background=4F46E5&color=fff&size=240&font-size=0.4&bold=true");
        String deptName = dept.getDepartmentName();
        d.setBio(String.format(
            "Dr. %s is a %s specialist at %s with %d years of clinical experience. "
            + "Having treated over %,d patients, %s brings a patient-first approach "
            + "to %s care and is known for clear communication and evidence-based treatment plans.",
            name.replace("Dr. ", ""), deptName, dept.getHospital().getName(), yearsExp, totalPatients,
            name.replace("Dr. ", ""), deptName
        ));
        repo.save(d);
    }

    // ─── Patient Records demo-data backfill ──────────────────────────────
    // Runs on every startup (idempotent — skips appointments that already
    // have a report). Attaches sample MedicalReport/Prescription/Notification
    // rows to past, non-cancelled, real-patient visits so the Patient Records
    // tab has realistic content without needing a doctor-side write feature.
    // Future/upcoming appointments are intentionally left empty — their
    // Reports/Medicine tabs correctly show "check back after your visit".
    private void backfillPatientRecords(AppointmentRepository apptRepo,
                                         MedicalReportRepository reportRepo,
                                         PrescriptionRepository prescriptionRepo,
                                         NotificationRepository notificationRepo) {
        System.out.println("📋 Backfilling Patient Records (reports/medicines/notifications) on past visits...");
        java.util.Random rng = new java.util.Random(42);
        LocalDate today = LocalDate.now();
        int visitsWithRecords = 0;

        for (Appointment appt : apptRepo.findRealBookingsWithDoctorAndDepartment()) {
            LocalDate visitDate;
            try {
                visitDate = LocalDate.parse(appt.getDateStr());
            } catch (Exception e) {
                continue; // malformed date guard
            }
            if (visitDate.isAfter(today)) continue; // future visit — no records yet
            if (reportRepo.existsByAppointmentId(appt.getId())) continue; // already backfilled

            Doctor doctor = appt.getDoctor();
            String deptName = (doctor.getDepartment() != null) ? doctor.getDepartment().getDepartmentName() : "General Medicine";

            // 1. Text report — always present for a past visit.
            MedicalReport notes = new MedicalReport();
            notes.setAppointmentId(appt.getId());
            notes.setReportType("text");
            notes.setTitle("Consultation Notes");
            notes.setReportDate(visitDate);
            notes.setTextContent(String.format(
                "Patient reviewed by %s for %s. Vitals recorded within normal limits. "
                + "Clinical history and current symptoms reviewed; treatment plan discussed with patient. "
                + "Advised follow-up as needed based on response to prescribed treatment.",
                doctor.getDoctorName(), deptName));
            reportRepo.save(notes);

            // 2. Occasional imaging report (~40% of visits) — placeholder image URL.
            //    No real file-upload/storage exists in this app yet (consistent with
            //    doctor photos, which also use an external placeholder service).
            if (rng.nextInt(10) < 4) {
                MedicalReport scan = new MedicalReport();
                scan.setAppointmentId(appt.getId());
                scan.setReportType("image");
                scan.setTitle("Diagnostic Imaging");
                scan.setReportDate(visitDate);
                scan.setFileUrl("https://picsum.photos/seed/medroute-apt-" + appt.getId() + "/640/440");
                reportRepo.save(scan);
            }

            // 3. Prescription — 2 to 4 medicines drawn from a department-flavored pool.
            List<String[]> shuffled = new java.util.ArrayList<>(medicinePoolFor(deptName));
            java.util.Collections.shuffle(shuffled, rng);
            int count = Math.min(2 + rng.nextInt(3), shuffled.size()); // 2..4
            for (int i = 0; i < count; i++) {
                String[] med = shuffled.get(i);
                Prescription rx = new Prescription();
                rx.setAppointmentId(appt.getId());
                rx.setMedicineName(med[0]);
                rx.setDosage(med[1]);
                rx.setFrequency(med[2]);
                rx.setDuration(med[3]);
                rx.setInstructions(med[4]);
                rx.setPrescribedDate(visitDate);
                prescriptionRepo.save(rx);
            }

            // 4. Notification — deterministic read/unread mix for a realistic badge count.
            if (appt.getPatientFk() != null) {
                Notification n = new Notification();
                n.setPatientFk(appt.getPatientFk());
                n.setAppointmentId(appt.getId());
                n.setType("report_added");
                n.setMessage("New consultation report from " + doctor.getDoctorName() + " is now available.");
                n.setRead(rng.nextBoolean());
                notificationRepo.save(n);
            }

            visitsWithRecords++;
        }

        System.out.println("📋 Attached demo reports/medicines/notifications to " + visitsWithRecords + " past visit(s).");
    }

    private List<String[]> medicinePoolFor(String departmentName) {
        String dept = departmentName == null ? "" : departmentName.toLowerCase();
        if (dept.contains("cardio")) {
            return List.of(
                new String[]{"Aspirin", "75mg", "Once daily", "30 days", "Take after breakfast"},
                new String[]{"Atorvastatin", "10mg", "Once daily (night)", "30 days", "Take at bedtime"},
                new String[]{"Metoprolol", "25mg", "Twice daily", "30 days", "Take with food"},
                new String[]{"Clopidogrel", "75mg", "Once daily", "30 days", "Take after breakfast"}
            );
        }
        if (dept.contains("onco")) {
            return List.of(
                new String[]{"Ondansetron", "4mg", "As needed (nausea)", "7 days", "Take 30 min before meals if nauseous"},
                new String[]{"Dexamethasone", "4mg", "Once daily", "5 days", "Take in the morning with food"},
                new String[]{"Folic Acid", "5mg", "Once daily", "30 days", "Take after any meal"},
                new String[]{"Paracetamol", "650mg", "As needed (pain)", "7 days", "Do not exceed 3 tablets/day"}
            );
        }
        if (dept.contains("neuro")) {
            return List.of(
                new String[]{"Levetiracetam", "500mg", "Twice daily", "30 days", "Take at consistent times daily"},
                new String[]{"Gabapentin", "300mg", "Twice daily", "30 days", "Take with food"},
                new String[]{"Vitamin B12", "1500mcg", "Once daily", "30 days", "Take after breakfast"},
                new String[]{"Sodium Valproate", "200mg", "Twice daily", "30 days", "Do not stop abruptly"}
            );
        }
        if (dept.contains("ortho")) {
            return List.of(
                new String[]{"Ibuprofen", "400mg", "Twice daily", "5 days", "Take after food"},
                new String[]{"Calcium + Vitamin D3", "500mg", "Once daily", "30 days", "Take after breakfast"},
                new String[]{"Diclofenac Gel", "1%", "Apply twice daily", "7 days", "Apply a thin layer, avoid broken skin"},
                new String[]{"Paracetamol", "650mg", "As needed (pain)", "5 days", "Do not exceed 3 tablets/day"}
            );
        }
        return List.of(
            new String[]{"Paracetamol", "500mg", "As needed", "5 days", "Take after food"},
            new String[]{"Multivitamin", "1 tablet", "Once daily", "30 days", "Take after breakfast"},
            new String[]{"ORS Sachets", "1 sachet", "As needed", "3 days", "Dissolve in 1L clean water"},
            new String[]{"Vitamin C", "500mg", "Once daily", "15 days", "Take after any meal"}
        );
    }

    }

