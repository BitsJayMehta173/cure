# MedRoute - Project Context & Memory Dump for LLMs

## 1. Project Overview & Core Concept
**MedRoute** is a sophisticated healthcare logistics and appointment routing engine. It acts as a "Compromise-Time Optimizer" that breaks geographical borders to help patients find the mathematically fastest path to medical treatment. 

The core problem it solves: Should a patient wait 3 weeks for a local specialist, or travel 800km via flight to be treated tomorrow? MedRoute calculates this exact "Sweet Spot" balancing geographical distance (travel time) against clinical wait times (queue lengths) using a custom scoring algorithm based on medical urgency.

## 2. Tech Stack & Repository Structure
- **Frontend:** React 19, TypeScript, Vite, CSS Modules (Custom UI, responsive). Location: `/frontend`
- **Backend:** Java 25, Spring Boot 3.2, Spring Data JPA, Hibernate. Location: `/backend-java`
- **Database:** PostgreSQL 17. (Auto-seeded on startup via `CommandLineRunner` in `MedRouteApplication.java`).

## 3. Core Domain Entities (PostgreSQL via JPA)
- `Hospital`: Name, Address, State, Latitude, Longitude.
- `HospitalDepartment`: Links Hospitals to Medical Conditions (e.g., Cardiology, Oncology).
- `Doctor`: The core entity. Contains Name, Daily Patient Limit, and three critical AI metrics:
  - `yearsOfExperience`: Used for AI seniority bonuses (>= 15 years).
  - `totalPatientsTreated`: UI trust metric.
  - `avgMinutesPerPatient`: Queue speed (used to calculate exact appointment times).
- `Appointment`: Tracks booked slots against a doctor on a specific Date (String format `YYYY-MM-DD`).

## 4. The Two Search Engines

### Engine A: "Find Match" (Strict Local Routing)
- **Goal:** Find appointments strictly within the user's selected state/city.
- **Reachability Engine:** This is the most complex constraint solver. 
  - It calculates the Great-Circle distance (Haversine formula) from the patient to the hospital.
  - It determines the transportation mode (Bike, Bus, Train, Flight) and calculates total `transportTimeHrs`.
  - It calculates the exact Token Time: `09:00 AM + ((TokenNumber - 1) * avgMinsPerPatient)`.
  - **The Check:** If `Current Time + transportTimeHrs > Token Time`, the patient physically cannot make the appointment today. The engine automatically bumps the appointment date forward (+1 Wait Day) until reachability is mathematically possible.

### Engine B: "AI Optimizer" (National Sweet Spot Calculator)
- **Goal:** Ignore state borders and score every reachable doctor nationwide using a penalty-based heuristic algorithm.
- **The Algorithm (`OptimizationService.calculateScore`):**
  1. **Raw Penalties:** Calculates penalty components based on `Wait Days`, `Distance` (converted to days), and `Urgency`.
  2. **Urgency Weighting:** Multipliers shift based on clinical urgency (1-10).
     - *Critical (8-10):* Heavily penalizes wait time (70% weight), ignores travel distance (10% weight).
     - *Routine (1-4):* Heavily penalizes travel distance (60% weight), accepts wait time (30% weight).
  3. **Doctor Bonuses:** Subtracts 10% from the penalty for Senior Specialists (>=15 yrs exp) and subtracts 15% for Fast Queues (<=12 mins/pt).
  4. **Output:** Inverts the penalty into a 0-100 `aiScore`. The frontend sorts by this score.

## 5. Key Frontend UI Features
- **AppointmentCard.tsx:** Renders complex appointment data including dynamic trust badges (`⭐ 20y Exp`, `👥 18.2k Patients`, `⚡ 10m/pt`), the AI Score progress ring, and transit instructions.
- **Journey Settings Modal:** Captures explicit user constraints:
  - `travelMode`: "ai" (default), "bike/auto", "bus", "train", "flight". If a manual mode is selected, the backend strictly respects it for time calculations, demonstrating how choosing a slow mode (Bike) for a long journey (1746km) pushes the reachable appointment date days into the future.
  - `patientCity`: For exact Haversine origin coordinates.
- **Advanced Filters:** Toggles for `requireSenior` and `requireFastQueue`.

## 6. Current State & Immediate Context
- The backend features a robust seeder (`MedRouteApplication.java`) that idempotently populates the database with realistic hospitals, doctors, and metric data across 5 Indian states.
- The system correctly handles "AI Fallback" logic: If the user selects "AI Recommended" transit, the backend uses distance thresholds (<15km = Auto, >800km = Flight) to assign the fastest practical transit mode.
- The repository was recently cleaned up to ignore `backend-java/target/` and is fully pushed to the `main` branch.

**To run the stack locally:**
- Backend: `cd backend-java && mvn spring-boot:run` (Port 8080)
- Frontend: `cd frontend && npm run dev` (Port 5173)
