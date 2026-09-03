import threading
import requests
import time
import random

API_URL = "http://localhost:8080/api/appointments/book"
DOCTOR_ID = 1 # Ensure this doctor exists in the DB with a limit (e.g., 5)
DATE_STR = "2026-09-02"
NUM_THREADS = 20

def book_appointment(thread_id):
    payload = {
        "doctorId": DOCTOR_ID,
        "dateStr": DATE_STR,
        "patientName": f"Patient_{thread_id}",
        "source": "Simulation"
    }
    
    headers = {'Content-Type': 'application/json'}
    
    try:
        response = requests.post(API_URL, json=payload, headers=headers)
        if response.status_code == 200:
            print(f"[Thread {thread_id}] SUCCESS: Booked {response.json()['tokenCode']}")
        elif response.status_code == 409:
            print(f"[Thread {thread_id}] REJECTED: Daily limit reached")
        else:
            print(f"[Thread {thread_id}] FAILED: Status {response.status_code} - {response.text}")
    except Exception as e:
        print(f"[Thread {thread_id}] ERROR: {str(e)}")

def main():
    print(f"Starting {NUM_THREADS} concurrent booking requests...")
    threads = []
    
    start_time = time.time()
    
    for i in range(NUM_THREADS):
        t = threading.Thread(target=book_appointment, args=(i,))
        threads.append(t)
        t.start()
        
    for t in threads:
        t.join()
        
    print(f"Finished in {time.time() - start_time:.2f} seconds.")

if __name__ == "__main__":
    main()
