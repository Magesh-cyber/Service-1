const BASE_URL = 'http://127.0.0.1:8000';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'API request failed');
  }

  return response.json();
}

export const endpoints = {
  login: '/login',
  verifyOtp: '/verify-otp',
  register: '/register',
  birthCertificate: '/services/birth-certificate',
  myRequests: '/citizen/my-requests',
  adminApplications: '/admin/applications',
  adminLoginLogs: '/admin/login-logs',
  adminAuditLogs: '/admin/audit-logs',
  clerkApplications: '/clerk/applications',
  clerkApprove: (id: string) => `/clerk/applications/${id}/approve`,
  clerkReject: (id: string) => `/clerk/applications/${id}/reject`,
  managerApplications: '/manager/applications',
  managerApprove: (id: string) => `/manager/applications/${id}/approve`,
  managerReject: (id: string) => `/manager/applications/${id}/reject`,
  report: (id: string) => `/report/${id}`,
  qrAccess: '/citizen/qr',
};
