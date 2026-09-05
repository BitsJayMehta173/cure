import requests
from datetime import datetime

today = datetime.now().strftime('%Y-%m-%d')

for doc_id in range(1, 6):
    print(f'Booking for Doctor ID {doc_id}...')
    for i in range(1, 11):
        payload = {
            'doctorId': doc_id,
            'dateStr': today,
            'patientName': f'Test Patient {i}',
            'source': 'TestingScript'
        }
        r = requests.post('http://localhost:8080/api/appointments/book', json=payload)
        if r.status_code in [200, 201]:
            print(f'  Booked appointment {i}')
        else:
            print(f'  Failed to book {i}: {r.text}')
