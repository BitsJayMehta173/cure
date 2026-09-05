import requests
from datetime import datetime

today = datetime.now().strftime('%Y-%m-%d')
total_booked = 0

for doc_id in range(6, 49):
    if total_booked >= 10:
        break
    
    print(f'Attempting Doctor ID {doc_id}...')
    for i in range(1, 11):
        if total_booked >= 10:
            break
            
        payload = {
            'doctorId': doc_id,
            'dateStr': today,
            'patientName': f'Test Patient {total_booked + 1}',
            'source': 'TestingScript'
        }
        r = requests.post('http://localhost:8080/api/appointments/book', json=payload)
        if r.status_code in [200, 201]:
            print(f'  Booked appointment for doc {doc_id}')
            total_booked += 1
        elif 'limit' in r.text.lower():
            break # Skip to next doctor if full
