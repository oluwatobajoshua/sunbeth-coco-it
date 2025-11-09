// Utility functions

export const getStationName = (stationId) => {
  const stationNames = {
    'coco-lagos-1': 'COCO Lagos Central',
    'coco-abuja-1': 'COCO Abuja Main', 
    'coco-port-1': 'COCO Port Harcourt',
    'coco-kano-1': 'COCO Kano Junction',
    'coco-ibadan-1': 'COCO Ibadan Express'
  };
  return stationNames[stationId] || stationId;
};

export const STATIONS = [
  'coco-lagos-1',
  'coco-abuja-1',
  'coco-port-1',
  'coco-kano-1',
  'coco-ibadan-1'
];

export const capitalizeFirst = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const formatDate = (date) => {
  if (!date) return 'Unknown';
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatDetailedDate = (date) => {
  if (!date) return 'Unknown';
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getIssueTypeIcon = (issueType) => {
  const icons = {
    'electrical': 'bolt',
    'mechanical': 'cog',
    'safety': 'shield-alt', 
    'equipment': 'wrench'
  };
  return icons[issueType] || 'exclamation-triangle';
};

// Export an array of objects to CSV
export const exportToCsv = (filename, rows) => {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replaceAll('"', '""');
    if (str.search(/[",\n]/g) >= 0) return `"${str}"`;
    return str;
  };
  const csv = [headers.join(',')]
    .concat(rows.map(r => headers.map(h => escape(r[h])).join(',')))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const validateForm = (data) => {
  // Partial-aware validation: only validate fields provided in `data`.
  // This enables step-by-step forms to validate just the current step.
  const errors = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(data ?? {}, key);

  if (has('stationId')) {
    if (!data.stationId) {
      errors.stationId = 'Station selection is required';
    }
  }

  if (has('issueType')) {
    if (!data.issueType) {
      errors.issueType = 'Issue type is required';
    }
  }

  if (has('description')) {
    const desc = (data.description || '').trim();
    if (desc.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }
  }

  if (has('priority')) {
    if (!data.priority) {
      errors.priority = 'Priority level is required';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const compressImage = (file, maxWidth = 800, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};