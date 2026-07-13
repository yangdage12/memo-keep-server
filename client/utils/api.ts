const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

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
  const url = `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/events${query ? `?${query}` : ''}`;

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
  const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/events/${id}`);
  const json = await response.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export async function fetchEventStats(): Promise<EventStats> {
  /**
   * 服务端文件：server/src/routes/events.ts
   * 接口：GET /api/v1/events/stats
   */
  const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/events/stats`);
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
  const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/events`, {
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
  const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/events/${id}`, {
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
  const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/events/${id}`, {
    method: 'DELETE',
  });
  const json = await response.json();
  if (!json.success) throw new Error(json.error);
}
