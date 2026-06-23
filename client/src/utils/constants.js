// Shared frontend constants for Zephyr. Mirrors backend enums.

export const LEAD_STATUSES = [
  'NEW_LEAD',
  'CONTACTED',
  'EMAIL_SENT',
  'FOLLOW_UP_REQUIRED',
  'INTERESTED',
  'MEETING_SCHEDULED',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
];

export const LEAD_STATUS_LABELS = {
  NEW_LEAD: 'New Lead',
  CONTACTED: 'Contacted',
  EMAIL_SENT: 'Email Sent',
  FOLLOW_UP_REQUIRED: 'Follow Up Required',
  INTERESTED: 'Interested',
  MEETING_SCHEDULED: 'Meeting Scheduled',
  PROPOSAL_SENT: 'Proposal Sent',
  NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
};

// Maps each status to a hex color + a tailwind-friendly variant key.
export const LEAD_STATUS_COLORS = {
  NEW_LEAD: '#9898a8', // gray
  CONTACTED: '#3b82f6', // blue
  EMAIL_SENT: '#6366f1', // indigo
  FOLLOW_UP_REQUIRED: '#f59e0b', // yellow
  INTERESTED: '#06b6d4', // cyan
  MEETING_SCHEDULED: '#a855f7', // purple
  PROPOSAL_SENT: '#f97316', // orange
  NEGOTIATION: '#ec4899', // pink
  CLOSED_WON: '#22c55e', // green
  CLOSED_LOST: '#ef4444', // red
};

// Category used for pipeline charts.
export const STATUS_CATEGORY = {
  CLOSED_WON: 'won',
  CLOSED_LOST: 'lost',
};
export function statusCategoryColor(status) {
  if (status === 'CLOSED_WON') return '#22c55e';
  if (status === 'CLOSED_LOST') return '#ef4444';
  return '#6366f1';
}

export const LEAD_SOURCES = ['AI_DISCOVERED', 'MANUAL', 'CSV_IMPORT'];
export const LEAD_SOURCE_LABELS = {
  AI_DISCOVERED: 'AI Discovered',
  MANUAL: 'Manual',
  CSV_IMPORT: 'CSV Import',
};

export const BUSINESS_SIZES = ['SOLO', 'SMALL', 'MEDIUM', 'LARGE'];
export const BUSINESS_SIZE_LABELS = {
  SOLO: 'Solo',
  SMALL: 'Small',
  MEDIUM: 'Medium',
  LARGE: 'Large',
};

export const ACTIVITY_TYPES = ['NOTE', 'CALL', 'EMAIL', 'MEETING', 'FOLLOW_UP', 'STATUS_CHANGE'];
export const ACTIVITY_TYPE_LABELS = {
  NOTE: 'Note',
  CALL: 'Call',
  EMAIL: 'Email',
  MEETING: 'Meeting',
  FOLLOW_UP: 'Follow-Up',
  STATUS_CHANGE: 'Status Change',
};
export const ACTIVITY_TYPE_COLORS = {
  NOTE: '#9898a8',
  CALL: '#22c55e',
  EMAIL: '#6366f1',
  MEETING: '#a855f7',
  FOLLOW_UP: '#f59e0b',
  STATUS_CHANGE: '#3b82f6',
};

export const INDUSTRIES = [
  'Technology',
  'E-Commerce',
  'Agency',
  'Healthcare',
  'Finance',
  'Education',
  'Real Estate',
  'Manufacturing',
  'Retail',
  'Hospitality',
  'Media & Entertainment',
  'Legal',
  'Automotive',
  'Energy',
  'Transportation & Logistics',
  'Construction',
  'Food & Beverage',
  'Agriculture',
  'Telecommunications',
  'Non-Profit',
];

// Helper to turn enum lists into Select options.
export const toOptions = (values, labels) =>
  values.map((v) => ({ value: v, label: labels?.[v] ?? v }));
