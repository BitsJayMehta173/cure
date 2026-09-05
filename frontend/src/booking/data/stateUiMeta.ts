export interface StateUiMeta {
  gradient: string;
  emoji: string;
}

export const stateUiMeta: Record<string, StateUiMeta> = {
  'Rajasthan': { gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', emoji: '🏜️' },
  'Maharashtra': { gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', emoji: '🏙️' },
  'Delhi NCR': { gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', emoji: '🏛️' },
  'Karnataka': { gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', emoji: '💻' },
  'Tamil Nadu': { gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', emoji: '🛕' },
};

export const fallbackStateMeta: StateUiMeta = {
  gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
  emoji: '📍'
};
