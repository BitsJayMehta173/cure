const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const { search, replace } of replacements) {
    content = content.replace(search, replace);
  }
  fs.writeFileSync(filePath, content);
}

const dir = path.join(__dirname, 'src');

// 1. App.tsx
replaceInFile(path.join(dir, 'App.tsx'), [
  { search: "import { Panel } from './components/Panel'\n", replace: "" }
]);

// 2. Booking API
replaceInFile(path.join(dir, 'booking', 'api', 'bookingApi.ts'), [
  { search: 'import {', replace: 'import type {' }
]);

// 3. BookingRoot
replaceInFile(path.join(dir, 'booking', 'BookingRoot.tsx'), [
  { search: "import { BookingWizardState, BookingStep } from './types/booking.types';", replace: "import type { BookingWizardState } from './types/booking.types';" }
]);

// 4. AppointmentsList
replaceInFile(path.join(dir, 'booking', 'components', 'Appointments', 'AppointmentsList.tsx'), [
  { search: "import { AppointmentSummary } from '../../types/booking.types';", replace: "import type { AppointmentSummary } from '../../types/booking.types';" }
]);

// 5. Breadcrumb
replaceInFile(path.join(dir, 'booking', 'components', 'Breadcrumb', 'Breadcrumb.tsx'), [
  { search: "import { BookingStep } from '../../types/booking.types';", replace: "import type { BookingStep } from '../../types/booking.types';" }
]);

// 6. CalendarStep
replaceInFile(path.join(dir, 'booking', 'components', 'Calendar', 'CalendarStep.tsx'), [
  { search: "import { SlotAvailability } from '../../types/booking.types';", replace: "import type { SlotAvailability } from '../../types/booking.types';" }
]);

// 7. DeptStep
replaceInFile(path.join(dir, 'booking', 'components', 'Department', 'DeptStep.tsx'), [
  { search: "import { DepartmentSummary } from '../../types/booking.types';", replace: "import type { DepartmentSummary } from '../../types/booking.types';" }
]);

// 8. HospitalStep
replaceInFile(path.join(dir, 'booking', 'components', 'HospitalSelect', 'HospitalStep.tsx'), [
  { search: "import { HospitalSummary } from '../../types/booking.types';", replace: "import type { HospitalSummary } from '../../types/booking.types';" }
]);

// 9. ConfirmModal
replaceInFile(path.join(dir, 'booking', 'components', 'Modals', 'ConfirmModal.tsx'), [
  { search: "import { TokenPreview, BookingConfirmation } from '../../types/booking.types';", replace: "import type { TokenPreview, BookingConfirmation } from '../../types/booking.types';" }
]);

// 10. ProfileStep
replaceInFile(path.join(dir, 'booking', 'components', 'Profile', 'ProfileStep.tsx'), [
  { search: "import { PatientProfile } from '../../types/booking.types';", replace: "import type { PatientProfile } from '../../types/booking.types';" }
]);

// 11. AppointmentCard
replaceInFile(path.join(dir, 'components', 'AppointmentCard.tsx'), [
  { search: "urgencyScore }: AppointmentCardProps", replace: "}: AppointmentCardProps" }
]);

console.log('Fixed imports!');
