import { getBackendUrl } from './backendUrl';

export interface EventItem {
  id: number;
  title: string;
  description: string | null;
  category: 'work' | 'life' | 'family';
  priority: 'high' | 'medium' | 'low';
  person: string | null;
  remind_time: string | null;
  is_completed: boolean;
  is_reminded: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventStats {
  total: number;
  completed: number;
  pending: number;
  upcoming: number;
  byCategory: { work: number; life: number; family: number };
  byPriority: { high: number; medium: number; low: number };
}

export async function fetchEvents(params?: {
  category?: string;
  priority?: string;
  is_completed?: boolean;
}): Promise<EventItem[]> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.priority) searchParams.set('priority', params.priority);
  if (params?.is_completed !== undefined) searchParams.set('is_completed', String(params.is_completed));

  const query = searchParams.toString();
  const url = `${getBackendUrl()}/api/v1/events${query ? `?${query}` : ''}`;

  /**
   * 服务端文件：server/src/routes/events.ts
   * 接口：GET /api/v1/events
   * Query 参数：category?: string, priority?: string, is_completed?: boolean
   */
  const response = await fetch(url);
  const json = await response.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export async function fetchEventById(id: number): Promise<EventItem> {
  /**
   * 服务端文件：server/src/routes/events.ts
   * 接口：GET /api/v1/events/:id
   * Path 参数：id: number
   */
  const response = await fetch(`${getBackendUrl()}/api/v1/events/${id}`);
  const json = await response.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export async function fetchEventStats(): Promise<EventStats> {
  /**
   * 服务端文件：server/src/routes/events.ts
   * 接口：GET /api/v1/events/stats
   */
  const response = await fetch(`${getBackendUrl()}/api/v1/events/stats`);
  const json = await response.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export async function createEvent(data: {
  title: string;
  description?: string;
  category: string;
  priority: string;
  person?: string;
  remind_time?: string;
}): Promise<EventItem> {
  /**
   * 服务端文件：server/src/routes/events.ts
   * 接口：POST /api/v1/events
   * Body 参数：title: string, description?: string, category: string, priority: string, person?: string, remind_time?: string
   */
  const response = await fetch(`${getBackendUrl()}/api/v1/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await response.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export async function updateEvent(id: number, data: {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  person?: string;
  remind_time?: string;
  is_completed?: boolean;
}): Promise<EventItem> {
  /**
   * 服务端文件：server/src/routes/events.ts
   * 接口：PUT /api/v1/events/:id
   * Path 参数：id: number
   * Body 参数：title?: string, description?: string, category?: string, priority?: string, person?: string, remind_time?: string, is_completed?: boolean
   */
  const response = await fetch(`${getBackendUrl()}/api/v1/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await response.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export async function deleteEvent(id: number): Promise<void> {
  /**
   * 服务端文件：server/src/routes/events.ts
   * 接口：DELETE /api/v1/events/:id
   * Path 参数：id: number
   */
  const response = await fetch(`${getBackendUrl()}/api/v1/events/${id}`, {
    method: 'DELETE',
  });
  const json = await response.json();
  if (!json.success) throw new Error(json.error);
}

export async function toggleEventComplete(id: number, isCompleted: boolean): Promise<void> {
  /**
   * 服务端文件：server/src/routes/events.ts
   * 接口：PATCH /api/v1/events/:id
   * Path 参数：id: number
   * Body 参数：is_completed: boolean
   */
  const response = await fetch(`${getBackendUrl()}/api/v1/events/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_completed: isCompleted }),
  });
  const json = await response.json();
  if (!json.success) throw new Error(json.error);
}

// ============ AI API ============

export interface AIEventResult {
  title: string;
  description: string;
  category: 'work' | 'life' | 'family';
  priority: 'high' | 'medium' | 'low';
  person: string;
  remind_time: string | null;
}

export interface ReportItem {
  id: number;
  type: 'monthly' | 'quarterly' | 'yearly';
  period: string;
  title: string;
  content: string;
  summary: string | null;
  event_count: number;
  created_at: string;
}

export async function transcribeAudio(audioUri: string): Promise<{ text: string; duration?: number }> {
  /**
   * 服务端文件：server/src/routes/ai.ts
   * 接口：POST /api/v1/ai/transcribe
   * Body: FormData with audio file
   */
  const formData = new FormData();
  const fileResponse = await fetch(audioUri);
  const fileBlob = await fileResponse.blob();
  formData.append('audio', fileBlob as any, 'recording.m4a');

  const response = await fetch(`${getBackendUrl()}/api/v1/ai/transcribe`, {
    method: 'POST',
    body: formData,
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error);
  return json;
}

export async function classifyEvent(text: string): Promise<AIEventResult> {
  /**
   * 服务端文件：server/src/routes/ai.ts
   * 接口：POST /api/v1/ai/classify
   * Body 参数：text: string
   */
  const response = await fetch(`${getBackendUrl()}/api/v1/ai/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error);
  return json;
}

export async function smartCreateEvent(text?: string, audioUri?: string): Promise<{ event: EventItem; transcribedText: string }> {
  /**
   * 服务端文件：server/src/routes/ai.ts
   * 接口：POST /api/v1/ai/smart-create
   * Body: FormData with text and/or audio file
   */
  const formData = new FormData();
  if (text) formData.append('text', text);
  if (audioUri) {
    const fileResponse = await fetch(audioUri);
    const fileBlob = await fileResponse.blob();
    formData.append('audio', fileBlob as any, 'recording.m4a');
  }

  const response = await fetch(`${getBackendUrl()}/api/v1/ai/smart-create`, {
    method: 'POST',
    body: formData,
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error);
  return json;
}

export async function generateReport(type: string, period: string): Promise<{ report: ReportItem; stats: any }> {
  /**
   * 服务端文件：server/src/routes/ai.ts
   * 接口：POST /api/v1/ai/generate-report
   * Body 参数：type: string, period: string
   */
  const response = await fetch(`${getBackendUrl()}/api/v1/ai/generate-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, period }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error);
  return json;
}

export async function fetchReports(): Promise<ReportItem[]> {
  /**
   * 服务端文件：server/src/routes/ai.ts
   * 接口：GET /api/v1/ai/reports
   */
  const response = await fetch(`${getBackendUrl()}/api/v1/ai/reports`);
  const json = await response.json();
  if (!response.ok) throw new Error(json.error);
  return json;
}

export async function fetchReportById(id: number): Promise<ReportItem> {
  /**
   * 服务端文件：server/src/routes/ai.ts
   * 接口：GET /api/v1/ai/reports/:id
   * Path 参数：id: number
   */
  const response = await fetch(`${getBackendUrl()}/api/v1/ai/reports/${id}`);
  const json = await response.json();
  if (!response.ok) throw new Error(json.error);
  return json;
}

export async function deleteReport(id: number): Promise<void> {
  /**
   * 服务端文件：server/src/routes/ai.ts
   * 接口：DELETE /api/v1/ai/reports/:id
   * Path 参数：id: number
   */
  const response = await fetch(`${getBackendUrl()}/api/v1/ai/reports/${id}`, {
    method: 'DELETE',
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error);
}
