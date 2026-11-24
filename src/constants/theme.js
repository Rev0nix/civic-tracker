// Lokify Design System & Constants
export const PALETTE = {
  bgMain: '#080F0F',
  bgSecondary: '#101819',
  bgCard: '#192223',
  bgElevated: '#202B2D',
  primaryTeal: '#A3DCE3',
  secondaryTeal: '#28616A',
  activeTeal: '#315C60',
  textPrimary: '#F0F4F4',
  textSecondary: '#A5B1B3',
  textMuted: '#758588',
  borderSubtle: '#354144',
  success: '#43C88A',
  warning: '#E9B85C',
  error: '#EF6666',
  info: '#8DBBEB',
};

export const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'Sparkles' },
  { id: '1', label: 'Pothole', icon: 'Car', sublabel: 'Roads & Potholes' },
  { id: '2', label: 'Streetlight', icon: 'Lightbulb', sublabel: 'Lighting' },
  { id: '3', label: 'Garbage', icon: 'Trash2', sublabel: 'Sanitation' },
  { id: '4', label: 'Water & Sewage', icon: 'Droplets', sublabel: 'Water' },
  { id: '5', label: 'Drainage', icon: 'Waves', sublabel: 'Drainage' },
  { id: '6', label: 'Road Damage', icon: 'AlertTriangle', sublabel: 'Infrastructure' },
  { id: '7', label: 'Public Safety', icon: 'ShieldAlert', sublabel: 'Safety' },
  { id: '8', label: 'Other', icon: 'HelpCircle', sublabel: 'General' },
];

export const STATUS_CONFIG = {
  Open: {
    label: 'Open',
    color: '#A5B1B3',
    bg: '#192223',
    border: '#354144',
    dot: '#758588',
  },
  Submitted: {
    label: 'Open',
    color: '#A5B1B3',
    bg: '#192223',
    border: '#354144',
    dot: '#758588',
  },
  Acknowledged: {
    label: 'Acknowledged',
    color: '#A3DCE3',
    bg: '#132B2F',
    border: '#28616A',
    dot: '#A3DCE3',
  },
  Assigned: {
    label: 'Assigned',
    color: '#8DBBEB',
    bg: '#142938',
    border: '#274F6E',
    dot: '#8DBBEB',
  },
  'In Progress': {
    label: 'In Progress',
    color: '#A3DCE3',
    bg: '#163236',
    border: '#315C60',
    dot: '#38BDF8',
  },
  Resolved: {
    label: 'Resolved',
    color: '#43C88A',
    bg: '#112C20',
    border: '#1D5C3F',
    dot: '#43C88A',
  },
  Reopened: {
    label: 'Reopened',
    color: '#EF6666',
    bg: '#321616',
    border: '#5C2424',
    dot: '#EF6666',
  },
};

export const formatIssueId = (rawId) => {
  if (!rawId) return 'LK-0001';
  const numeric = String(rawId).replace(/\D/g, '');
  if (!numeric) return `LK-${String(rawId).slice(0, 4).toUpperCase()}`;
  const numVal = parseInt(numeric, 10);
  if (numVal < 1000) {
    return `LK-${2400 + numVal}`;
  }
  return `LK-${numVal}`;
};

export const getCategoryName = (categoryId) => {
  const match = CATEGORIES.find((c) => c.id === String(categoryId));
  return match ? match.label : 'Municipal Issue';
};

/**
 * Maps frontend UI categories (1-8) safely to PostgreSQL categories (1-4)
 * ensuring no foreign key constraint violations on `issues_category_id_fkey`.
 */
export const mapToDbCategoryId = (catId) => {
  const num = parseInt(catId, 10);
  switch (num) {
    case 1:
    case 6:
      return 1; // Pothole & Road Damage
    case 2:
    case 7:
      return 2; // Streetlight & Safety
    case 3:
    case 8:
      return 3; // Garbage & Cleanliness
    case 4:
    case 5:
      return 4; // Water & Sewage / Drainage
    default:
      return [1, 2, 3, 4].includes(num) ? num : 1;
  }
};

export const getRelativeTime = (dateInput) => {
  if (!dateInput) return 'Recently';
  const now = new Date();
  const past = new Date(dateInput);
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return past.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};

// Generates an atmospheric SVG placeholder graphic for cards without photos
export const getCategoryIllustration = (categoryId) => {
  const idStr = String(categoryId);
  switch (idStr) {
    case '1':
      return 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80';
    case '2':
      return 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80';
    case '3':
      return 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80';
    case '4':
    case '5':
      return 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80';
    case '6':
      return 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80';
    default:
      return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80';
  }
};
