import { format, formatDistanceToNow } from 'date-fns';

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy HH:mm:ss');
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    Critical: 'text-critical',
    High: 'text-high',
    Medium: 'text-medium',
    Low: 'text-low',
  };
  return colors[severity] || 'text-text-secondary';
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'text-text-tertiary',
    cloning: 'text-blue-400',
    scanning: 'text-blue-400',
    analyzing: 'text-gold',
    patching: 'text-gold',
    testing: 'text-blue-400',
    completed: 'text-green-400',
    failed: 'text-critical',
  };
  return colors[status] || 'text-text-secondary';
}

// Made with Bob
