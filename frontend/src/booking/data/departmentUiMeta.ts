export interface DepartmentUiMeta {
  icon: string;
  color: string;
}

export const departmentUiMeta: Record<string, DepartmentUiMeta> = {
  'Cardiology': { icon: '❤️', color: '#ef4444' },
  'Neurology': { icon: '🧠', color: '#8b5cf6' },
  'Orthopedics': { icon: '🦴', color: '#f59e0b' },
  'Oncology': { icon: '🎗️', color: '#ec4899' },
};

export const fallbackDepartmentMeta: DepartmentUiMeta = {
  icon: '⚕️',
  color: '#006078'
};
