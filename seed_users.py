import psycopg2
import hashlib
import os
from datetime import datetime

def hash_pw(raw):
    # Must match AuthController.hashPassword: SHA-256, lowercase HEX (not base64).
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def load_env(path=os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')):
    env = {}
    with open(path, encoding='utf-8-sig') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k] = v
    return env

env = load_env()
conn = psycopg2.connect(dbname=env.get('DB_NAME', 'postgres'),
                        user=env.get('SPRING_DATASOURCE_USERNAME', 'postgres'),
                        password=env['SPRING_DATASOURCE_PASSWORD'],  # from .env — never hard-code it
                        host='localhost')
cur = conn.cursor()

pw_hash = hash_pw('password')
now = datetime.now()

# Insert Doctor
cur.execute("""
    INSERT INTO user_account (email, password_hash, full_name, mobile, role, doctor_id, created_at)
    VALUES ('doctor@medroute.com', %s, 'Dr. Kavita Sharma', '9999999999', 'DOCTOR', 1, %s)
    RETURNING id;
""", (pw_hash, now))
doctor_user_id = cur.fetchone()[0]

# Insert Patient
cur.execute("""
    INSERT INTO user_account (email, password_hash, full_name, mobile, role, created_at)
    VALUES ('patient@medroute.com', %s, 'Test Patient', '8888888888', 'PATIENT', %s)
    RETURNING id;
""", (pw_hash, now))
patient_user_id = cur.fetchone()[0]

# Insert Default Patient Profile
cur.execute("""
    INSERT INTO patient (full_name, relation, mobile, age, gender, blood_group, user_account_id, created_at)
    VALUES ('Test Patient', 'self', '8888888888', 30, 'Male', 'O+', %s, %s)
    RETURNING id;
""", (patient_user_id, now))
patient_profile_id = cur.fetchone()[0]

# Update default patient id
cur.execute("""
    UPDATE user_account SET default_patient_id = %s WHERE id = %s
""", (patient_profile_id, patient_user_id))

conn.commit()
cur.close()
conn.close()

print("Created test users: doctor@medroute.com / password and patient@medroute.com / password")
