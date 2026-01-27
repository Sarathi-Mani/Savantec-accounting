/**
 * Utility functions for formatting data
 */

/**
 * Format currency in Indian Rupees
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format date in Indian format (DD/MM/YYYY)
 */
export const formatDate = (dateString: Date | string | null | undefined): string => {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return '-';
  
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Format date with time
 */
export const formatDateTime = (dateString: Date | string | null | undefined): string => {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return '-';
  
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format number with Indian grouping
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-IN').format(num);
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

/**
 * Format GST number with validation
 */
export const formatGSTIN = (gstin: string | null | undefined): string => {
  if (!gstin) return '-';
  
  // Basic validation for GSTIN format (15 characters, alphanumeric)
  const cleaned = gstin.trim().toUpperCase();
  if (cleaned.length === 15) {
    return cleaned;
  }
  
  return cleaned;
};

/**
 * Format phone number
 */
export const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return '-';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0,5)} ${cleaned.slice(5)}`;
  }
  
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned.slice(0,2)} ${cleaned.slice(2,7)} ${cleaned.slice(7)}`;
  }
  
  return phone;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format time duration
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours < 24) return `${hours}h ${remainingMinutes}m`;
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  return `${days}d ${remainingHours}h`;
};

/**
 * Format address in multiple lines
 */
export const formatAddress = (
  address?: string,
  city?: string,
  state?: string,
  country?: string,
  zip?: string
): string[] => {
  const lines: string[] = [];
  
  if (address) lines.push(address.trim());
  
  const locationParts = [
    city?.trim(),
    state?.trim(),
    zip?.trim()
  ].filter(Boolean);
  
  if (locationParts.length > 0) {
    lines.push(locationParts.join(' - '));
  }
  
  if (country && country !== 'India') {
    lines.push(country.trim());
  }
  
  return lines;
};

/**
 * Format status with color class
 */
export const getStatusColor = (status: string): {
  bg: string;
  text: string;
  icon?: string;
} => {
  switch (status?.toLowerCase()) {
    case 'paid':
      return {
        bg: 'bg-green-100',
        text: 'text-green-700',
        icon: '✓'
      };
    case 'pending':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        icon: '⏱'
      };
    case 'partially_paid':
    case 'partial':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        icon: '½'
      };
    case 'cancelled':
      return {
        bg: 'bg-red-100',
        text: 'text-red-700',
        icon: '✗'
      };
    case 'draft':
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        icon: '📝'
      };
    case 'refunded':
      return {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        icon: '↩'
      };
    case 'void':
      return {
        bg: 'bg-gray-200',
        text: 'text-gray-800',
        icon: '🗑'
      };
    case 'write_off':
      return {
        bg: 'bg-red-50',
        text: 'text-red-800',
        icon: '📉'
      };
    case 'active':
      return {
        bg: 'bg-green-50',
        text: 'text-green-700',
        icon: '✅'
      };
    case 'inactive':
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        icon: '⏸'
      };
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-700'
      };
  }
};

/**
 * Format status text (convert snake_case to Title Case)
 */
export const formatStatusText = (status: string): string => {
  if (!status) return 'Draft';
  
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Calculate days between two dates
 */
export const daysBetween = (date1: Date | string, date2: Date | string = new Date()): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  // Reset time part to compare only dates
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Format days ago or from now
 */
export const timeAgo = (date: Date | string): string => {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  
  const years = Math.floor(days / 365);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
};