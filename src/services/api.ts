import { auth } from '../lib/firebase';
import { AnalyticsBundle, AnalyticsFilterState, SportWithStats } from '../types/analytics';

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function buildFilterQuery(filter: Partial<AnalyticsFilterState>): string {
  const params = new URLSearchParams();
  if (filter.sport && filter.sport !== 'all') params.set('sport', filter.sport);
  if (filter.granularity) params.set('granularity', filter.granularity);
  if (filter.sourceFilter && filter.sourceFilter !== 'all') params.set('sourceFilter', filter.sourceFilter);
  if (filter.dateFrom) params.set('dateFrom', filter.dateFrom);
  if (filter.dateTo) params.set('dateTo', filter.dateTo);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchAnalyticsBundle(filter: Partial<AnalyticsFilterState>): Promise<AnalyticsBundle> {
  const res = await fetch(`/api/analytics/bundle${buildFilterQuery(filter)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load analytics');
  }
  return res.json();
}

export async function fetchSportsCatalog(): Promise<SportWithStats[]> {
  const res = await fetch('/api/sports');
  if (!res.ok) throw new Error('Failed to load sports catalog');
  const data = await res.json();
  return data.sports;
}

export async function previewSentiment(text: string) {
  const res = await fetch('/api/analysis/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Preview failed');
  return data.analysis;
}

export async function runSingleSparkAnalysis(text: string, sportSlug: string) {
  const headers = await authHeaders();
  const res = await fetch('/api/analysis/sentiment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ text, sportSlug }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to run Spark sentiment analysis');
  return data;
}

export async function runBatchSparkAnalysis(comments: string[], sportSlug: string, sourceSlug = 'manual-entry') {
  const headers = await authHeaders();
  const res = await fetch('/api/analysis/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ comments, sportSlug, sourceSlug }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Batch analysis failed');
  return data;
}

export async function uploadFileSparkAnalysis(file: File, sportSlug: string) {
  const headers = await authHeaders();
  const form = new FormData();
  form.append('file', file);
  form.append('sportSlug', sportSlug);
  const res = await fetch('/api/comments/upload', {
    method: 'POST',
    headers,
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'File upload ingestion failed');
  return data;
}

export async function fetchPaginatedComments(params: {
  sport: string;
  polarity: string;
  search: string;
  page: number;
}) {
  const qs = new URLSearchParams({
    sport: params.sport,
    polarity: params.polarity,
    search: params.search,
    page: String(params.page),
    pageSize: '10',
  });
  const res = await fetch(`/api/comments?${qs.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch comments');
  return res.json();
}

export async function deleteComment(id: number) {
  const headers = await authHeaders();
  const res = await fetch(`/api/comments/${id}`, {
    method: 'DELETE',
    headers,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Delete failed');
  return data;
}

export async function fetchAdminOverview() {
  const headers = await authHeaders();
  const res = await fetch('/api/admin/overview', { headers });
  if (!res.ok) throw new Error('Failed to load admin overview');
  return res.json();
}

export async function updateUserRoleApi(userId: number, roleName: string) {
  const headers = await authHeaders();
  const res = await fetch(`/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ roleName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Role update failed');
  return data.user;
}

export async function fetchAcademicFiles() {
  const res = await fetch('/api/academic/files');
  if (!res.ok) throw new Error('Failed to load Java Spark codebase');
  return res.json();
}
