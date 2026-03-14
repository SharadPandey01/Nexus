/**
 * NEXUS API Service — Centralized client for all backend endpoints.
 * All calls include error handling and return parsed JSON.
 */

const API_BASE = '/api';

async function request(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`[API] ${options.method || 'GET'} ${path} failed:`, err);
    throw err;
  }
}

// ── Dashboard ────────────────────────────────────────────
export const getDashboard = () => request('/dashboard');
export const getActivity = () => request('/activity');
export const getApprovals = () => request('/approvals');
export const handleApproval = (id, action) =>
  request(`/approval/${id}?decision=${action}`, {
    method: 'POST',
  });
export const getInsights = () => request('/insights');

// ── Schedule ─────────────────────────────────────────────
export const getSessions = () => request('/schedule/sessions');
export const createSession = (data) =>
  request('/schedule/sessions', { method: 'POST', body: JSON.stringify(data) });
export const updateSession = (id, data) =>
  request(`/schedule/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const updateSessionPosition = (id, data) =>
  request(`/schedule/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const optimizeSchedule = () =>
  request('/schedule/optimize', { method: 'POST' });
export const simulateChange = (description) =>
  request('/schedule/simulate', { method: 'POST', body: JSON.stringify({ description }) });

// ── Mail Center ──────────────────────────────────────────
export const getParticipants = () => request('/mail/participants');
export const uploadParticipants = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload/participants`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
};
export const personalizeEmails = (template, segment) =>
  request('/mail/personalize', {
    method: 'POST',
    body: JSON.stringify({ template, segment_criteria: segment }),
  });
export const draftEmails = (prompt, segment = 'all') =>
  request('/mail/draft', {
    method: 'POST',
    body: JSON.stringify({ prompt, segment }),
  });
export const sendBatch = () =>
  request('/mail/send', { method: 'POST' });

// ── Content Studio ───────────────────────────────────────
export const generateContent = (brief, platforms, tone) =>
  request('/content/generate', {
    method: 'POST',
    body: JSON.stringify({ brief, platforms, tone }),
  });
export const getContentQueue = () => request('/content/queue');
export const approveContent = (id) =>
  request(`/content/queue/${id}/approve`, { method: 'POST' });

// ── Agent System ─────────────────────────────────────────
export const getAgentStatus = () => request('/agents/status');
export const getAgentState = () => request('/agents/state');
export const getAgentLogs = () => request('/agents/logs');
export const getBudget = () => request('/agents/budget');
export const sendChat = (message, type = null) =>
  invokeAgents(message, type);

// ── Events ───────────────────────────────────────────────
export const createEvent = (prompt) =>
  request('/events', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
export const getEvents = () => request('/events');
export const activateEvent = (id) =>
  request(`/events/${id}/activate`, { method: 'POST' });

export const listEvents = () => request('/events');

// ── Agent Invocation ─────────────────────────────────────
export const invokeAgents = (userInput, requestType = null, eventId = null) => {
  const params = new URLSearchParams({ user_input: userInput });
  if (requestType) params.append('request_type', requestType);
  if (eventId) params.append('event_id', eventId);
  return request(`/agents/invoke?${params.toString()}`, { method: 'POST' });
};

// ── File Upload (Participants) ───────────────────────────
export const uploadEventFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload/participants`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Upload failed: HTTP ${res.status}`);
  }
  return res.json();
};
