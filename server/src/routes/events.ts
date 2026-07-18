import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();

// GET /api/v1/events - 获取事件列表
// Query 参数：category?: string, priority?: string, is_completed?: boolean
router.get('/', async (req, res) => {
  try {
    const { category, priority, is_completed } = req.query;
    const client = getSupabaseClient();

    let query = client
      .from('events')
      .select('id, title, description, category, priority, person, remind_time, is_completed, is_reminded, created_at, updated_at')
      .order('remind_time', { ascending: true, nullsFirst: false });

    if (category && typeof category === 'string' && category !== 'all') {
      query = query.eq('category', category);
    }
    if (priority && typeof priority === 'string' && priority !== 'all') {
      query = query.eq('priority', priority);
    }
    if (is_completed !== undefined) {
      query = query.eq('is_completed', is_completed === 'true');
    }

    const { data, error } = await query;
    if (error) throw new Error(`查询失败: ${error.message}`);

    res.json({ success: true, data: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/v1/events/stats - 获取事件统计
router.get('/stats', async (_req, res) => {
  try {
    const client = getSupabaseClient();

    const { data: allEvents, error } = await client
      .from('events')
      .select('id, category, priority, is_completed, remind_time');
    if (error) throw new Error(`查询失败: ${error.message}`);

    const events = allEvents || [];
    const total = events.length;
    const completed = events.filter(e => e.is_completed).length;
    const pending = total - completed;

    const byCategory = {
      work: events.filter(e => e.category === 'work').length,
      life: events.filter(e => e.category === 'life').length,
      family: events.filter(e => e.category === 'family').length,
    };

    const byPriority = {
      high: events.filter(e => e.priority === 'high').length,
      medium: events.filter(e => e.priority === 'medium').length,
      low: events.filter(e => e.priority === 'low').length,
    };

    const now = new Date();
    const upcoming = events.filter(e => {
      if (!e.remind_time || e.is_completed) return false;
      return new Date(e.remind_time) > now;
    }).length;

    res.json({
      success: true,
      data: { total, completed, pending, upcoming, byCategory, byPriority },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/v1/events/:id - 获取单个事件
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('events')
      .select('id, title, description, category, priority, person, remind_time, is_completed, is_reminded, created_at, updated_at')
      .eq('id', Number(id))
      .maybeSingle();
    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) {
      res.status(404).json({ success: false, error: '事件不存在' });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/v1/events - 创建事件
// Body 参数：title: string, description?: string, category: string, priority: string, person?: string, remind_time?: string, scheduledAt?: string
router.post('/', async (req, res) => {
  try {
    const { title, description, category, priority, person, remind_time, scheduledAt } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ success: false, error: '标题不能为空' });
      return;
    }

    const validCategories = ['work', 'life', 'family'];
    if (!validCategories.includes(category)) {
      res.status(400).json({ success: false, error: '分类无效' });
      return;
    }

    const validPriorities = ['high', 'medium', 'low'];
    if (!validPriorities.includes(priority)) {
      res.status(400).json({ success: false, error: '优先级无效' });
      return;
    }

    const client = getSupabaseClient();
    const insertData: Record<string, unknown> = {
      title: title.trim(),
      description: description || null,
      category,
      priority,
      person: person || null,
      remind_time: remind_time || scheduledAt || null,
    };

    const { data, error } = await client
      .from('events')
      .insert(insertData)
      .select()
      .single();
    if (error) throw new Error(`创建失败: ${error.message}`);

    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// PUT /api/v1/events/:id - 更新事件
// Body 参数：title?: string, description?: string, category?: string, priority?: string, person?: string, remind_time?: string, is_completed?: boolean
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData: Record<string, unknown> = {};

    const allowedFields = ['title', 'description', 'category', 'priority', 'person', 'remind_time', 'is_completed'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }
    updateData.updated_at = new Date().toISOString();

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ success: false, error: '没有需要更新的字段' });
      return;
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('events')
      .update(updateData)
      .eq('id', Number(id))
      .select()
      .single();
    if (error) throw new Error(`更新失败: ${error.message}`);

    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// DELETE /api/v1/events/:id - 删除事件
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    const { error } = await client
      .from('events')
      .delete()
      .eq('id', Number(id));
    if (error) throw new Error(`删除失败: ${error.message}`);

    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
