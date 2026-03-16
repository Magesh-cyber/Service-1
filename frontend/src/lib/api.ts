const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const url = `${BASE_URL}${endpoint}`;
  console.log(`[API] Fetching: ${url}`);
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      window.location.href = '/login?msg=session_expired';
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'API request failed');
  }

  return response.json();
}

export async function downloadFile(endpoint: string, filename: string) {
  const token = localStorage.getItem('token');
  const url = `${BASE_URL}${endpoint}`;
  
  const headers = {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error('Download failed');

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export const endpoints = {
  login: '/login',
  verifyOtp: '/verify-otp',
  resendOtp: '/resend-otp',
  register: '/register',
  birthCertificate: '/services/birth-certificate',

  marriageCertificate: '/services/marriage-certificate',
  incomeCertificate: '/services/income-certificate',
  communityCertificate: '/services/community-certificate',
  passportApplication: '/services/passport-application',
  drivingLicense: '/services/driving-license',
  voterId: '/services/voter-id',
  buildingPermit: '/services/building-permit',
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
  identityQr: '/citizen/identity-qr',
  downloadPdf: (id: string, final: boolean = false) => `/services/application/${id}/pdf?final=${final}`,
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  profile: '/profile',
  uploadProfilePhoto: '/upload-profile-photo',
  // PDS Admin Endpoints
  pdsLogin: '/login', // Using same login for now, role will distinguish
  pdsCitizen: (code: string) => `/pds/citizen/${code}`,
  pdsDistribute: '/pds/distribute',
  pdsStock: '/pds/stock',
  pdsBulkSync: '/pds/bulksync',
  pdsTransactions: '/pds/transactions',
  pdsTransactionsMe: '/pds/transactions/me',
  pdsBillDownload: (id: string) => `/citizen/pds-bill/${id}`,
  pdsSummary: '/pds/summary',
};
