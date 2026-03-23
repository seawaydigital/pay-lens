export interface RoleFamily {
  id: string;
  name: string;
  category: string;
}

export const ROLE_FAMILIES: RoleFamily[] = [
  // Healthcare
  { id: 'physician', name: 'Physician', category: 'Healthcare' },
  { id: 'nurse', name: 'Nurse', category: 'Healthcare' },
  { id: 'pharmacist', name: 'Pharmacist', category: 'Healthcare' },
  { id: 'dentist', name: 'Dentist', category: 'Healthcare' },
  { id: 'health-admin', name: 'Health Administrator', category: 'Healthcare' },
  { id: 'allied-health', name: 'Allied Health Professional', category: 'Healthcare' },

  // Education
  { id: 'professor', name: 'Professor', category: 'Education' },
  { id: 'teacher', name: 'Teacher', category: 'Education' },
  { id: 'principal', name: 'Principal / Vice-Principal', category: 'Education' },
  { id: 'education-admin', name: 'Education Administrator', category: 'Education' },
  { id: 'researcher', name: 'Researcher', category: 'Education' },

  // Public Safety
  { id: 'police-officer', name: 'Police Officer', category: 'Public Safety' },
  { id: 'firefighter', name: 'Firefighter', category: 'Public Safety' },
  { id: 'paramedic', name: 'Paramedic', category: 'Public Safety' },
  { id: 'corrections', name: 'Corrections Officer', category: 'Public Safety' },

  // Government & Administration
  { id: 'executive', name: 'Executive / C-Suite', category: 'Government & Administration' },
  { id: 'director', name: 'Director', category: 'Government & Administration' },
  { id: 'manager', name: 'Manager', category: 'Government & Administration' },
  { id: 'policy-analyst', name: 'Policy Analyst', category: 'Government & Administration' },
  { id: 'clerk', name: 'Clerk / Administrative', category: 'Government & Administration' },

  // Legal
  { id: 'judge', name: 'Judge / Justice', category: 'Legal' },
  { id: 'lawyer', name: 'Lawyer / Crown Attorney', category: 'Legal' },

  // Engineering & Technical
  { id: 'engineer', name: 'Engineer', category: 'Engineering & Technical' },
  { id: 'it-professional', name: 'IT Professional', category: 'Engineering & Technical' },
  { id: 'planner', name: 'Planner', category: 'Engineering & Technical' },

  // Finance
  { id: 'accountant', name: 'Accountant / Finance', category: 'Finance' },
  { id: 'auditor', name: 'Auditor', category: 'Finance' },

  // Trades & Operations
  { id: 'trades', name: 'Skilled Trades', category: 'Trades & Operations' },
  { id: 'utilities', name: 'Utilities Operator', category: 'Trades & Operations' },
  { id: 'transit', name: 'Transit Operator', category: 'Trades & Operations' },

  // Other
  { id: 'other', name: 'Other', category: 'Other' },
];
