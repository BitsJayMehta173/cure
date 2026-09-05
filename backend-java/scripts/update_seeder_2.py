import re

with open('src/main/java/com/medroute/MedRouteApplication.java', 'r', encoding='utf-8') as f:
    content = f.read()

simulator_code = """
            System.out.println("🤖 Running Patient Traffic Simulator...");
            java.util.Random random = new java.util.Random(42); // deterministic seed
            java.time.LocalDate today = java.time.LocalDate.now();
            
            for (Doctor doc : doctorRepo.findAll()) {
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
                    apptRepo.save(a);
                }
            }

            System.out.println("✅ Database seeded! Hospitals: " + hospitalRepo.count() +
                               ", Doctors: " + doctorRepo.count() + ", Appointments: " + apptRepo.count());
"""

# Replace the closing println with the simulator loop
content = re.sub(
    r'System\.out\.println\("✅ Database seeded! Hospitals: " \+ hospitalRepo\.count\(\) \+\s+", Doctors: " \+ doctorRepo\.count\(\)\);',
    simulator_code,
    content
)

# We need to inject AppointmentRepository into the CommandLineRunner method signature
content = content.replace(
    'HospitalDepartmentRepository deptRepo,\n            DoctorRepository doctorRepo) {',
    'HospitalDepartmentRepository deptRepo,\n            DoctorRepository doctorRepo,\n            AppointmentRepository apptRepo) {'
)

with open('src/main/java/com/medroute/MedRouteApplication.java', 'w', encoding='utf-8') as f:
    f.write(content)
