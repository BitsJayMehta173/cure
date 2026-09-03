package com.medroute;

import com.medroute.entity.Doctor;
import com.medroute.entity.Hospital;
import com.medroute.entity.HospitalDepartment;
import com.medroute.repository.DoctorRepository;
import com.medroute.repository.HospitalRepository;
import com.medroute.repository.HospitalDepartmentRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class MedRouteApplication {

    public static void main(String[] args) {
        SpringApplication.run(MedRouteApplication.class, args);
    }

    @Bean
    CommandLineRunner seedDatabase(
            HospitalRepository hospitalRepo,
            HospitalDepartmentRepository deptRepo,
            DoctorRepository doctorRepo) {
        return args -> {
            // If DB is empty, full seed. If populated, update new columns on existing doctors.
            if (hospitalRepo.count() > 0) {
                System.out.println("♻️  Migrating new doctor intelligence fields...");
                migrateExistingDoctors(doctorRepo);
                System.out.println("✅ Migration done.");
                return;
            }

            System.out.println("🌱 Seeding MedRoute database with realistic data...");

            // ─── RAJASTHAN ────────────────────────────────────────────────
            Hospital h1 = saveHospital(hospitalRepo, "SMS Hospital Jaipur", "Sawai Man Singh Rd, Jaipur", "Rajasthan", 26.9015, 75.8002);
            HospitalDepartment d1 = saveDept(deptRepo, h1, "Cardiology");
            saveDoctor(doctorRepo, d1, "Dr. Kavita Sharma",   20, 12, 18200, 10);
            saveDoctor(doctorRepo, d1, "Dr. Rahul Mehta",     15, 20, 9800,  15);
            HospitalDepartment d2 = saveDept(deptRepo, h1, "Oncology");
            saveDoctor(doctorRepo, d2, "Dr. Priya Singh",     22, 15, 14500, 12);
            saveDoctor(doctorRepo, d2, "Dr. Anil Gupta",       8, 18, 4200,  20);

            Hospital h2 = saveHospital(hospitalRepo, "Fortis Hospital Jaipur", "Jawahar Lal Nehru Marg, Jaipur", "Rajasthan", 26.8700, 75.8200);
            HospitalDepartment d3 = saveDept(deptRepo, h2, "Cardiology");
            saveDoctor(doctorRepo, d3, "Dr. Sunita Agarwal",  17, 16, 11200, 10);
            saveDoctor(doctorRepo, d3, "Dr. Vikas Joshi",      5, 22, 2100,  25);
            HospitalDepartment d4 = saveDept(deptRepo, h2, "Neurology");
            saveDoctor(doctorRepo, d4, "Dr. Pooja Choudhary", 12, 14, 7800,  18);
            saveDoctor(doctorRepo, d4, "Dr. Deepak Verma",    20, 18, 16200, 10);

            Hospital h3 = saveHospital(hospitalRepo, "AIIMS Jodhpur", "Basni Industrial Area, Jodhpur", "Rajasthan", 26.2481, 72.9992);
            HospitalDepartment d5 = saveDept(deptRepo, h3, "Cardiology");
            saveDoctor(doctorRepo, d5, "Dr. Ramesh Pareek",   25, 14, 22000,  8);
            HospitalDepartment d6 = saveDept(deptRepo, h3, "Oncology");
            saveDoctor(doctorRepo, d6, "Dr. Meena Rathore",   18, 12, 13500, 12);
            saveDoctor(doctorRepo, d6, "Dr. Suresh Patel",     6, 16, 3200,  20);

            // ─── DELHI NCR ────────────────────────────────────────────────
            Hospital h4 = saveHospital(hospitalRepo, "AIIMS New Delhi", "Sri Aurobindo Marg, New Delhi", "Delhi NCR", 28.5672, 77.2100);
            HospitalDepartment d7 = saveDept(deptRepo, h4, "Cardiology");
            saveDoctor(doctorRepo, d7, "Dr. Rajan Kapoor",    30, 12, 31000,  8);
            saveDoctor(doctorRepo, d7, "Dr. Anjali Sood",     20, 20, 18400, 10);
            HospitalDepartment d8 = saveDept(deptRepo, h4, "Oncology");
            saveDoctor(doctorRepo, d8, "Dr. Vivek Malhotra",  25, 14, 24500,  8);
            saveDoctor(doctorRepo, d8, "Dr. Nisha Arora",     12, 18, 9100,  15);
            HospitalDepartment d9 = saveDept(deptRepo, h4, "Neurology");
            saveDoctor(doctorRepo, d9, "Dr. Amit Bansal",     18, 16, 14200, 12);

            Hospital h5 = saveHospital(hospitalRepo, "Apollo Delhi", "Sarita Vihar, New Delhi", "Delhi NCR", 28.5421, 77.2858);
            HospitalDepartment d10 = saveDept(deptRepo, h5, "Cardiology");
            saveDoctor(doctorRepo, d10, "Dr. Rahul Jain",     10, 20, 6800,  15);
            saveDoctor(doctorRepo, d10, "Dr. Sheetal Grover",  3, 24, 1200,  25);
            HospitalDepartment d11 = saveDept(deptRepo, h5, "Orthopedics");
            saveDoctor(doctorRepo, d11, "Dr. Manish Kumar",   16, 18, 12300, 12);
            saveDoctor(doctorRepo, d11, "Dr. Rekha Goel",     22, 14, 17800, 10);

            Hospital h6 = saveHospital(hospitalRepo, "Max Hospital Gurgaon", "Sushant Lok, Gurgaon", "Delhi NCR", 28.4736, 77.0952);
            HospitalDepartment d12 = saveDept(deptRepo, h6, "Oncology");
            saveDoctor(doctorRepo, d12, "Dr. Sanjay Luthra",  20, 15, 17200, 10);
            HospitalDepartment d13 = saveDept(deptRepo, h6, "Neurology");
            saveDoctor(doctorRepo, d13, "Dr. Aarti Mishra",    9, 20, 5600,  20);
            saveDoctor(doctorRepo, d13, "Dr. Kiran Bhatia",   15, 16, 10800, 15);

            // ─── MAHARASHTRA ──────────────────────────────────────────────
            Hospital h7 = saveHospital(hospitalRepo, "KEM Hospital Mumbai", "Acharya Donde Marg, Mumbai", "Maharashtra", 19.0033, 72.8404);
            HospitalDepartment d14 = saveDept(deptRepo, h7, "Cardiology");
            saveDoctor(doctorRepo, d14, "Dr. Suhas Kulkarni",  28, 16, 26000,  8);
            saveDoctor(doctorRepo, d14, "Dr. Priti Deshpande", 14, 22, 9400,  15);
            HospitalDepartment d15 = saveDept(deptRepo, h7, "Oncology");
            saveDoctor(doctorRepo, d15, "Dr. Vijay Mhatre",    20, 14, 18500, 10);
            saveDoctor(doctorRepo, d15, "Dr. Smita Joshi",      7, 18, 3800,  20);

            Hospital h8 = saveHospital(hospitalRepo, "Kokilaben Hospital Mumbai", "Rao Saheb Achutrao Patwardhan Marg, Mumbai", "Maharashtra", 19.1196, 72.8285);
            HospitalDepartment d16 = saveDept(deptRepo, h8, "Cardiology");
            saveDoctor(doctorRepo, d16, "Dr. Rajiv Nanda",     23, 14, 20100, 10);
            HospitalDepartment d17 = saveDept(deptRepo, h8, "Neurology");
            saveDoctor(doctorRepo, d17, "Dr. Aditi Wadia",     16, 18, 12000, 15);
            saveDoctor(doctorRepo, d17, "Dr. Girish Tambe",    10, 20, 6200,  20);

            Hospital h9 = saveHospital(hospitalRepo, "Ruby Hall Clinic Pune", "Sassoon Rd, Pune", "Maharashtra", 18.5196, 73.8765);
            HospitalDepartment d18 = saveDept(deptRepo, h9, "Orthopedics");
            saveDoctor(doctorRepo, d18, "Dr. Sachin Bhosale",  20, 20, 16800, 10);
            saveDoctor(doctorRepo, d18, "Dr. Varsha Patil",    12, 24, 7400,  15);
            HospitalDepartment d19 = saveDept(deptRepo, h9, "Oncology");
            saveDoctor(doctorRepo, d19, "Dr. Rajesh Joshi",    18, 15, 13900, 12);

            // ─── KARNATAKA ────────────────────────────────────────────────
            Hospital h10 = saveHospital(hospitalRepo, "Manipal Hospital Bangalore", "HAL Airport Rd, Bangalore", "Karnataka", 12.9562, 77.6406);
            HospitalDepartment d20 = saveDept(deptRepo, h10, "Cardiology");
            saveDoctor(doctorRepo, d20, "Dr. Krishnaraj Pai",  26, 14, 23500,  8);
            saveDoctor(doctorRepo, d20, "Dr. Divya Shenoy",    15, 20, 10800, 12);
            HospitalDepartment d21 = saveDept(deptRepo, h10, "Oncology");
            saveDoctor(doctorRepo, d21, "Dr. Prasad Rao",      19, 16, 15200, 10);
            HospitalDepartment d22 = saveDept(deptRepo, h10, "Neurology");
            saveDoctor(doctorRepo, d22, "Dr. Suma Nair",       12, 18, 8900,  15);
            saveDoctor(doctorRepo, d22, "Dr. Suresh Babu",      6, 22, 2800,  25);

            Hospital h11 = saveHospital(hospitalRepo, "Narayana Health Bangalore", "Bommasandra, Bangalore", "Karnataka", 12.8121, 77.6908);
            HospitalDepartment d23 = saveDept(deptRepo, h11, "Cardiology");
            saveDoctor(doctorRepo, d23, "Dr. Devi Shetty Jr.", 22, 16, 19800, 10);
            HospitalDepartment d24 = saveDept(deptRepo, h11, "Orthopedics");
            saveDoctor(doctorRepo, d24, "Dr. Latha Subramaniam",17, 20, 13200, 12);
            saveDoctor(doctorRepo, d24, "Dr. Harish Gowda",     8, 24, 4500,  20);

            // ─── TAMIL NADU ───────────────────────────────────────────────
            Hospital h12 = saveHospital(hospitalRepo, "Apollo Hospitals Chennai", "Greams Rd, Chennai", "Tamil Nadu", 13.0606, 80.2536);
            HospitalDepartment d25 = saveDept(deptRepo, h12, "Cardiology");
            saveDoctor(doctorRepo, d25, "Dr. M. Ravindran",    28, 14, 25600,  8);
            saveDoctor(doctorRepo, d25, "Dr. Nalini Iyer",     16, 20, 12100, 12);
            HospitalDepartment d26 = saveDept(deptRepo, h12, "Oncology");
            saveDoctor(doctorRepo, d26, "Dr. Krishnaswamy T.", 24, 15, 21200, 10);
            HospitalDepartment d27 = saveDept(deptRepo, h12, "Neurology");
            saveDoctor(doctorRepo, d27, "Dr. Prabhavathi G.",  18, 18, 14600, 12);
            saveDoctor(doctorRepo, d27, "Dr. Selvaraj K.",     10, 22, 6400,  18);

            Hospital h13 = saveHospital(hospitalRepo, "MIOT International Chennai", "Mount Poonamallee Rd, Chennai", "Tamil Nadu", 13.0345, 80.1682);
            HospitalDepartment d28 = saveDept(deptRepo, h13, "Orthopedics");
            saveDoctor(doctorRepo, d28, "Dr. Arun Muthu",      20, 18, 17400, 10);
            saveDoctor(doctorRepo, d28, "Dr. Chitra Rajan",    12, 22, 8100,  15);
            HospitalDepartment d29 = saveDept(deptRepo, h13, "Cardiology");
            saveDoctor(doctorRepo, d29, "Dr. Venkataraman S.", 15, 16, 11200, 15);

            System.out.println("✅ Database seeded! Hospitals: " + hospitalRepo.count() +
                               ", Doctors: " + doctorRepo.count());
        };
    }

    private Hospital saveHospital(HospitalRepository repo, String name, String address, String state, double lat, double lon) {
        Hospital h = new Hospital();
        h.setName(name); h.setAddress(address); h.setState(state); h.setLatitude(lat); h.setLongitude(lon);
        return repo.save(h);
    }

    private HospitalDepartment saveDept(HospitalDepartmentRepository repo, Hospital hospital, String deptName) {
        HospitalDepartment d = new HospitalDepartment();
        d.setHospital(hospital); d.setDepartmentName(deptName);
        return repo.save(d);
    }

    private void saveDoctor(DoctorRepository repo, HospitalDepartment dept, String name,
                            int yearsExp, int dailyLimit, int totalPatients, int avgMins) {
        Doctor d = new Doctor();
        d.setDepartment(dept); d.setDoctorName(name); d.setDailyLimit(dailyLimit);
        d.setYearsOfExperience(yearsExp); d.setTotalPatientsTreated(totalPatients); d.setAvgMinutesPerPatient(avgMins);
        repo.save(d);
    }

    /** Maps doctor name → {yearsExp, totalPatients, avgMins} for migration */
    private void migrateExistingDoctors(DoctorRepository repo) {
        java.util.Map<String, int[]> data = new java.util.HashMap<>();
        data.put("Dr. Kavita Sharma",      new int[]{20, 18200, 10});
        data.put("Dr. Rahul Mehta",        new int[]{15,  9800, 15});
        data.put("Dr. Priya Singh",        new int[]{22, 14500, 12});
        data.put("Dr. Anil Gupta",         new int[]{ 8,  4200, 20});
        data.put("Dr. Sunita Agarwal",     new int[]{17, 11200, 10});
        data.put("Dr. Vikas Joshi",        new int[]{ 5,  2100, 25});
        data.put("Dr. Pooja Choudhary",    new int[]{12,  7800, 18});
        data.put("Dr. Deepak Verma",       new int[]{20, 16200, 10});
        data.put("Dr. Ramesh Pareek",      new int[]{25, 22000,  8});
        data.put("Dr. Meena Rathore",      new int[]{18, 13500, 12});
        data.put("Dr. Suresh Patel",       new int[]{ 6,  3200, 20});
        data.put("Dr. Rajan Kapoor",       new int[]{30, 31000,  8});
        data.put("Dr. Anjali Sood",        new int[]{20, 18400, 10});
        data.put("Dr. Vivek Malhotra",     new int[]{25, 24500,  8});
        data.put("Dr. Nisha Arora",        new int[]{12,  9100, 15});
        data.put("Dr. Amit Bansal",        new int[]{18, 14200, 12});
        data.put("Dr. Rahul Jain",         new int[]{10,  6800, 15});
        data.put("Dr. Sheetal Grover",     new int[]{ 3,  1200, 25});
        data.put("Dr. Manish Kumar",       new int[]{16, 12300, 12});
        data.put("Dr. Rekha Goel",         new int[]{22, 17800, 10});
        data.put("Dr. Sanjay Luthra",      new int[]{20, 17200, 10});
        data.put("Dr. Aarti Mishra",       new int[]{ 9,  5600, 20});
        data.put("Dr. Kiran Bhatia",       new int[]{15, 10800, 15});
        data.put("Dr. Suhas Kulkarni",     new int[]{28, 26000,  8});
        data.put("Dr. Priti Deshpande",    new int[]{14,  9400, 15});
        data.put("Dr. Vijay Mhatre",       new int[]{20, 18500, 10});
        data.put("Dr. Smita Joshi",        new int[]{ 7,  3800, 20});
        data.put("Dr. Rajiv Nanda",        new int[]{23, 20100, 10});
        data.put("Dr. Aditi Wadia",        new int[]{16, 12000, 15});
        data.put("Dr. Girish Tambe",       new int[]{10,  6200, 20});
        data.put("Dr. Sachin Bhosale",     new int[]{20, 16800, 10});
        data.put("Dr. Varsha Patil",       new int[]{12,  7400, 15});
        data.put("Dr. Rajesh Joshi",       new int[]{18, 13900, 12});
        data.put("Dr. Krishnaraj Pai",     new int[]{26, 23500,  8});
        data.put("Dr. Divya Shenoy",       new int[]{15, 10800, 12});
        data.put("Dr. Prasad Rao",         new int[]{19, 15200, 10});
        data.put("Dr. Suma Nair",          new int[]{12,  8900, 15});
        data.put("Dr. Suresh Babu",        new int[]{ 6,  2800, 25});
        data.put("Dr. Devi Shetty Jr.",    new int[]{22, 19800, 10});
        data.put("Dr. Latha Subramaniam",  new int[]{17, 13200, 12});
        data.put("Dr. Harish Gowda",       new int[]{ 8,  4500, 20});
        data.put("Dr. M. Ravindran",       new int[]{28, 25600,  8});
        data.put("Dr. Nalini Iyer",        new int[]{16, 12100, 12});
        data.put("Dr. Krishnaswamy T.",    new int[]{24, 21200, 10});
        data.put("Dr. Prabhavathi G.",     new int[]{18, 14600, 12});
        data.put("Dr. Selvaraj K.",        new int[]{10,  6400, 18});
        data.put("Dr. Arun Muthu",         new int[]{20, 17400, 10});
        data.put("Dr. Chitra Rajan",       new int[]{12,  8100, 15});
        data.put("Dr. Venkataraman S.",    new int[]{15, 11200, 15});

        repo.findAll().forEach(doctor -> {
            int[] vals = data.get(doctor.getDoctorName());
            if (vals != null) {
                doctor.setYearsOfExperience(vals[0]);
                doctor.setTotalPatientsTreated(vals[1]);
                doctor.setAvgMinutesPerPatient(vals[2]);
                repo.save(doctor);
            }
        });
    }
}

