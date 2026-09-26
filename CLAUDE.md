# MedRoute

Healthcare appointment routing: patients find/book doctors across Indian states (wait time vs travel trade-off), doctors manage visits and refer cases, staff administer patients/appointments.

## Stack & running

| Part | Path | Run | Port |
|---|---|---|---|
| Frontend — React 19, TS, Vite, plain CSS, no router/state lib | `frontend/` | `npm run dev` · check: `npx tsc -b`, `npm run lint` (oxlint) | 5173 |
| Backend — Spring Boot 3.2, Java 21, JPA, Flyway | `backend-java/` | `mvn spring-boot:run` · check: `mvn -q compile` | 8080 |
| ML — Flask + PyTorch (search scorer) + clinical autocomplete (`suggest/`) | `backend-ml/` | `python ml_server.py` (Python 3.12 locally: `py -3.12`; keep code 3.10-compatible for Docker) | 5000 |
| DB — PostgreSQL 17 (`pg_trgm` for fuzzy doctor search) | `docker-compose.yml` | | 5432 |

Config: `backend-java/src/main/resources/application.yml` (imports `../.env`). Frontend base URL: `import.meta.env.VITE_API_URL || 'http://localhost:8080'`. No test suite exists.

On startup `MedRouteApplication` seeds hospitals/doctors/holidays + simulated appointments if the DB is empty; otherwise it backfills doctor photo/bio and demo reports/prescriptions/notifications on past real visits.

## Auth & roles

- `POST /api/auth/signup|login` — unsalted SHA-256 **hex**, no tokens/sessions. Response user object is stored in `localStorage['medroute_user']`.
- Every API call passes `userId` as a query param; the backend trusts it. There is **no server-side authorization** (don't assume any).
- `App.tsx` routes by `user.role`: `DOCTOR` → `pages/DoctorDashboard`, `STAFF` → `pages/StaffDashboard`, `PATIENT` → 4-tab app.
- PATIENT signup auto-creates a `Patient` (relation `self`) = `UserAccount.defaultPatientId`. One account owns many patient profiles (family).

## Data model (`backend-java/.../entity`)

- `Hospital` 1—* `HospitalDepartment` 1—* `Doctor` (real FKs). A department row is per-hospital.
- `Appointment`: FK `doctor`; plain-id `patientFk`, `hospitalId`, `departmentId` (denormalized). `dateStr` is a `YYYY-MM-DD` **string**. `status`: `confirmed` | `cancelled` (soft delete) | `completed`. `source`: `Simulator` | `BookingWizard` | `RecommendationTab`.
- `Appointment` provenance: `parentAppointmentId` (visit it follows up on) and `originReferralId` (TRANSFER it was booked from). Same-doctor follow-ups form a live **care chain**; a handover-booked visit starts a **separate** case file (history arrives as imported copies).
- `Referral`: patient, referredByDoctor, referredToDoctor, `appointment` (source visit; null for FULL_HISTORY), `followUpAppointment`, plus Java enums (stored as strings):
  - `kind`: `CONSULT` (second opinion — findings go back, patient stays with the referring doctor) | `TRANSFER` (handover — referred doctor takes over).
  - `scope`: `CASE` | `FULL_HISTORY` · `status`: see Referral lifecycle · `responseNotes` (referred doctor's findings / decline reason), `respondedAt`, `acceptedAt`, `closedAt`.
- `FollowUpRequest` (`follow_up_request`): same-doctor follow-up after a visit, `OPEN` → `BOOKED` (reopens if the booked visit is cancelled). **Not** a referral.
- `MedicalReport`, `Prescription` (by `appointmentId`, or only `referralId` for a FULL_HISTORY second opinion; `authorName`, `authorDoctorId`; copy provenance `isSnapshot`/`sourceRecordId`/`sourceAppointmentId`/`importedFromReferralId`). **Records are immutable** — append-only, no edit endpoints; `Appointment.generalAdvice` is write-once (2nd save → 409). `Notification` (by `patientFk`; `referral_accepted` tells the patient to book), `Holiday` (`state = null` ⇒ national), `Cancellation` (audit), `UserAccount` (`role`, `doctorId`, `defaultPatientId`).
- Appointment/follow-up statuses are **lowercase strings**; referral kind/scope/status are uppercase enums.

## Backend layout & key logic

Layers: `controller` → `service` → `repository` (Spring Data). Field `@Autowired`, `@CrossOrigin("*")` per controller (the `cors.allowed-origins` property is unused). Portal endpoints return `Map<String,Object>`; booking wizard returns DTOs in `dto/`. Errors via `ResponseStatusException`.

| Controller | Base path | Used by |
|---|---|---|
| `AuthController` | `/api/auth` | `auth/AuthContext.tsx` |
| `BookingFlowController` | `/api/booking` (profiles, states, hospitals, departments, slots, preview, available-doctors, confirm, appointments — each with server `displayStatus`) | `booking/api/bookingApi.ts` |
| `ReferralController` | `/api/referrals` (create, incoming/outgoing/patient lists, get, appointment-status, respond, accept, decline, cancel, book-follow-up) | `referrals/api/referralApi.ts` |
| `FollowUpController` | `/api/follow-ups` (create at finalize, patient list, patient book) | `referrals/api/referralApi.ts` |
| `CaseRecordsController` | `/api/case-records` (case file for a visit or a referral; add report / prescription) | `referrals/api/referralApi.ts` (`caseRecordsApi`) |
| `SearchController` + `FiltersController` | `/api/search/state`, `/api/search/filters` | recommendation tab in `App.tsx` |
| `BookingController` | `/api/appointments/book` | recommendation tab booking modal |
| `DoctorController` | `/api/doctors` (fuzzy search, profile GET/PUT/DELETE, list) | Doctor Directory, doctor profile edit, signup |
| `DoctorPortalController` | `/api/doctor-portal` (patients, appointments, advice, complete, patient history — chain-aware, doctor search, test-data wipe) | `DoctorDashboard`, `PatientProfileView`, `ReferralModal` |
| `RecordsController` | `/api/records` (patient read-only: patients+unread, reports, medicines, mark-read) | `records/api/recordsApi.ts`, `PatientProfileView` (`userId=0` skips ownership) |
| `StaffController` | `/api/staff` | `StaffDashboard` |
| `StatsController`, `DashboardController` | `/api/stats`, `/api/dashboard/capacity` | landing stats |

- **Slot/token engine — `service/BookingFlowService`** (single source of truth; reuse it for any booking):
  - Day status: past/Sunday → `not_open`, holiday → `holiday`, non-cancelled count ≥ `dailyLimit` → `full`.
  - `nextAvailableToken` = max token ever issued (incl. cancelled) + 1; 0 means full.
  - `computeQueuePosition` = rank among confirmed tokens; expected time = **09:00** + (pos−1) × `avgMinutesPerPatient` (09:00 is hard-coded everywhere; `Hospital.opdHours` is ignored).
  - `confirmBooking` locks the doctor row (`findByIdWithLock`) and **rejects a doctor not in the given hospital+department**.
- **Referrals — `service/ReferralService`** is the ONLY place that changes referral state, decides record access (`canView` / `viewableAppointmentIds`, following the care chain) and computes what screens show (`displayStatus`, timelines, per-viewer `actions`). `FollowUpService` owns same-doctor follow-ups. Both book through `BookingFlowService.confirmBooking` at the doctor's own hospital/department, derived server-side. Cancelling an appointment publishes `AppointmentCancelledEvent`; both services listen and reopen the referral/follow-up for rebooking.
- **Case file — `service/CaseRecordsService`**: reports / prescriptions / notes for a visit, each with an `Ownership` (author, role `visit_doctor`/`second_opinion`/`imported`, `inherited`, `mine`).
  - **Second opinion = live shared case**: the CONSULT doctor adds their own records on the shared visit (CASE) or the referral (FULL_HISTORY) while open (`ReferralService.canAddConsultRecords`, action `add_records`).
  - **Handover = copy**: creating a TRANSFER freezes the referring doctor's case file into a packet (`is_snapshot` rows on the referral; advice/findings become text reports) — what the referred doctor reviews. Booking the follow-up imports the packet into the new visit as its starting records (`importedFromReferralId`, original author kept, read-only like all records). A TRANSFER grants **no** live access to the referring doctor's visits; later additions by either doctor never cross over. Driven by `HandoverEvents` (published by ReferralService, handled here).
  - Writes are append-only: a visit's doctor adds to their visit; a CONSULT doctor adds to the open referral. Nothing can be edited once written. Adding a record notifies the patient.
- **Search — `SearchController` + `service/OptimizationService`**: haversine distance from `CITY_COORDINATES`/`STATE_COORDINATES`, transport mode by distance/urgency zone, scans ≤30 days for a reachable open slot, scores via ML `POST {ml.api.url}/api/predict` (heuristic fallback if ML is down).

## Frontend layout

- `App.tsx` — role switch; patient tabs `doctors | recommendation | booking | records` (tab state, no router). The recommendation/search UI and its modals live inline here.
- `booking/` — `BookingRoot.tsx` step machine: `profiles → states → hospitals → consultation → department → calendar (Modals/ConfirmModal) → appointments`. Entry modes via props: normal wizard, `doctorMode`+`doctorInfo` (from Doctor Directory). `api/bookingApi.ts`, `types/booking.types.ts`.
- `records/` — `PatientRecordsRoot.tsx`: `chooser → gallery → detail` (Status/Reports/Medicine panels).
- `referrals/` — `api/referralApi.ts` (+ `followUpApi`), `types/referral.types.ts`, and shared components: `StatusTimeline`/`StatusBadge` (render server timelines), `ReferralCard` (perspective `from`/`to`/`patient`), `SlotPicker`, `CaseRecordsPanel` + `OwnerChip` (the shared case file — used in the visit detail and the workspace), `AppointmentReferralsPanel` (referring doctor), `ReferralWorkspace` (referred doctor), `PatientCareItems` + `BookVisitModal` (patient book buttons).
- `pages/DoctorDashboard.tsx` (many components in one file): `EditProfilePanel`, `DoctorPatientDirectory`, `DoctorAppointmentsTab` → `DoctorAptDetail` (status/reports/prescriptions/advice/referrals/finalize), `DoctorReferralsTab` (needs action / received / sent) → `ReferralWorkspace`.
- `components/` — shared: `PatientProfileView` (doctor view of a patient; `embedded` inside the workspace), `ReferralModal`, `AppointmentCard`/`HospitalColumn`/`Slider` (search results), `Auth/AuthPage`.
- **Never derive appointment/referral status in the UI** — render `displayStatus`, `timeline` and `actions` from the server.
- Cross-component window event: `medroute:exit-doctor-mode`.
- Doctor/staff pages call `fetch` directly; patient features go through the `api/` modules. `getCurrentUserId()` is duplicated per module by convention.

## Clinical autocomplete (`backend-ml/suggest/`, `frontend/src/smart-input/`)

- "Grammarly for doctors": ghost-text completion, next-word picks and click-to-fix spelling underlines. Used **only** in the doctor's report (title, body), prescription (medicine, dosage, frequency, duration, instructions) and general-advice inputs, not in search boxes. Full details: `backend-ml/suggest/README.md`; held-out quality numbers: `suggest/EVALUATION.md`.
- Backend: Flask blueprint `suggest/routes.py` at `/api/suggest` (`health`, `complete`, `check`, `learn`, `dictionary`), registered in `ml_server.py`, and warm-loaded in a background thread (503 until ready). `engine.py` routes per field. Uses n-gram models (`ngram.py`), SymSpell (`corrector.py`), a 254k-SKU Indian medicine index (`medicine.py`) and phrase lists (`phrases.py`, `vocab_lists.py`).
- Models: `suggest/models/*.pkl.gz` (~12 MB, committed). Rebuild with `python -m suggest.build`, from raw CSVs in the gitignored `suggest/data/raw/` (sources and checksums in the README). `python -m suggest.evaluate` rewrites EVALUATION.md.
- Per-doctor learning: the frontend posts saved text to `/learn`. It is stored in `suggest/data/personal.sqlite` (gitignored; contains clinical text), and each doctor's profile only affects their own suggestions.
- Frontend: `SmartTextInput` (a drop-in for `<input>`/`<textarea>` via `field`, `value`, `onChange(value)`, `doctorId`, `multiline`, `context={{ medicine }}`) renders a mirror overlay for ghost text and underlines. `suggestApi.ts` calls `VITE_ML_URL || http://127.0.0.1:5000`: use 127.0.0.1, because `localhost` costs ~200 ms per call on Windows. It never throws and backs off for 30 s when the ML server is down, so the inputs then behave as plain fields. To add a field, give it a new `SuggestField` and a backend entry in `engine.py` (`FREE_FIELDS`/`PHRASE_FIELDS`/`CHECK_FIELDS`), then call `suggestApi.learn` after a successful save.
- Keys: `Tab` accepts the highlighted item, else the ghost; `→` at the end accepts the ghost; `↓` opens the list; `Esc` dismisses.

## Referral lifecycle

- **CONSULT (second opinion):** `REQUESTED` → `RESPONDED` (referred doctor sends findings) → closed when the referring doctor completes the visit. Source visit shows `referred` → `feedback_received` → `completed`.
- **TRANSFER (handover):** `REQUESTED` → `ACCEPTED` (source visit auto-completes but shows `referred`; patient gets a `referral_accepted` notification) → `FOLLOW_UP_BOOKED` (booked by the patient or the referred doctor via `book-follow-up`, atomically linked). Cancelling that follow-up returns it to `ACCEPTED`.
- Either kind: `REQUESTED` → `DECLINED` (referred doctor; visit returns to `confirmed` with the referring doctor, who can refer elsewhere) or `CANCELLED` (referring doctor).
- Only one *active* (`REQUESTED`/`ACCEPTED`) referral per case/history per destination doctor (409 otherwise). Self-referral is rejected — use `/api/follow-ups`.
- **Record access:** a doctor sees visits they attended, visits shared with them for a second opinion (`CASE`, or all for `FULL_HISTORY`), plus same-doctor ancestors via `parentAppointmentId` (the walk stops at a handover-booked visit). A handover shares a frozen copy, not access. A booked follow-up is a normal appointment and can itself be referred onward (its imported copies travel in the next packet).

## Adding a feature — conventions

- Schema change = entity field **plus** a new Flyway file `backend-java/src/main/resources/db/migration/V<next>__desc.sql` (Hibernate is `ddl-auto: validate`; it will not create columns). Latest is V14.
- Frontend feature = folder with `api/`, `types/`, `components/<Name>/<Name>.tsx + .css`, and a `*Root.tsx` step machine when multi-step.
- Keep slot/token/time math in `BookingFlowService`; don't re-derive it in controllers or the UI.

## Known issues / gotchas

- No authz: `userId`/`doctorId` params are trusted (ReferralService validates actor *consistency*, not identity); `userId=0` bypasses records ownership; `DELETE /api/doctor-portal/test-data/clear-all` is open; `DELETE /api/booking/appointments/{id}/remove` has no ownership check.
- N+1 queries: `findAll().stream()` filtering in `DoctorPortalController` (history, doctor search), `getHospitalsByState`, per-row lookups in `toAppointmentSummaryDTO`; search calls the ML service once per doctor.
- Calendar only shows the current month (`CalendarStep`, doctor finalize calendars).
- Doctor photos are stored as base64 data URLs in `doctor.photo_url` (TEXT).
- Dev servers started from the Claude app preview pane stop when the app closes the pane — if logins suddenly fail, check that the backend is listening on :8080 (`curl localhost:8080/actuator/health`).
- Launch configs in `.claude/launch.json`; `ml` runs `py -3.12 backend-ml/ml_server.py` (the MSYS `python` on PATH has no pip). After pulling, run `pip install -r backend-ml/requirements.txt` (adds `symspellpy`).
- `medroute_context_for_llms.md` is outdated (predates roles, records, referrals).
