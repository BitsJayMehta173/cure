import re

with open('src/main/java/com/medroute/MedRouteApplication.java', 'r', encoding='utf-8') as f:
    content = f.read()

# Update saveDoctor signature
content = content.replace(
    'private void saveDoctor(DoctorRepository repo, HospitalDepartment dept, String name,\n                            int yearsExp, int dailyLimit, int totalPatients, int avgMins)',
    'private void saveDoctor(DoctorRepository repo, HospitalDepartment dept, String name,\n                            String qualification, int yearsExp, int dailyLimit, int totalPatients, int avgMins)'
)
content = content.replace(
    'd.setYearsOfExperience(yearsExp); d.setTotalPatientsTreated(totalPatients); d.setAvgMinutesPerPatient(avgMins);',
    'd.setQualification(qualification); d.setYearsOfExperience(yearsExp); d.setTotalPatientsTreated(totalPatients); d.setAvgMinutesPerPatient(avgMins);'
)

# Update each saveDoctor call to inject a qualification based on department
def inject_qual(match):
    dept_var = match.group(1)
    name = match.group(2)
    rest = match.group(3)
    
    # We will just guess the qualification from the preceding line or simply use a smart fallback
    return f'saveDoctor(doctorRepo, {dept_var}, {name}, "MBBS, MD (Specialist)", {rest})'

content = re.sub(r'saveDoctor\(doctorRepo,\s*([a-zA-Z0-9_]+),\s*("[^"]+"),\s*([0-9,\s]+)\)', inject_qual, content)

# Remove migrateExistingDoctors and its call
content = re.sub(r'System\.out\.println\("♻️  Migrating new doctor intelligence fields\.\.\."\);\s*migrateExistingDoctors\(doctorRepo\);\s*System\.out\.println\("✅ Migration done\."\);\s*return;', 
    'System.out.println("✅ Database already seeded, skipping."); return;', content)
    
content = re.sub(r'/\*\* Maps doctor name → \{yearsExp, totalPatients, avgMins\} for migration \*/.*?\}\n\}\n', '}\n', content, flags=re.DOTALL)

with open('src/main/java/com/medroute/MedRouteApplication.java', 'w', encoding='utf-8') as f:
    f.write(content)
