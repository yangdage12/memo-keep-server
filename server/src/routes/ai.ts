import express, { type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import os from "os";
import fs from "fs";
import { ASRClient, LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { getSupabaseClient } from "../storage/database/supabase-client";

const router = express.Router();
const upload = multer({ dest: path.join(os.tmpdir(), "uploads") });

// POST /api/v1/ai/transcribe - 语音转文字
router.post("/transcribe", upload.single("audio"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "请上传音频文件" });
    }

    const audioPath = req.file.path;
    const audioBuffer = fs.readFileSync(audioPath);

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const asrClient = new ASRClient(config, customHeaders);

    // 将音频文件转为 base64
    const audioBase64 = audioBuffer.toString("base64");

    const result = await asrClient.recognize({
      uid: "memokeep-user",
      base64Data: audioBase64,
    });

    // 清理临时文件
    fs.unlinkSync(audioPath);

    res.json({ text: result.text });
  } catch (error) {
    console.error("ASR error:", error);
    res.status(500).json({ error: "语音识别失败" });
  }
});

// POST /api/v1/ai/classify - AI 智能分类
router.post("/classify", async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "请提供文本内容" });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    const systemPrompt = `你是一个智能事件分类助手。请分析用户输入的文本，提取事件信息并返回 JSON 格式。

返回格式：
{
  "title": "事件标题（简洁概括）",
  "description": "事件描述（详细内容）",
  "category": "work|life|family",
  "priority": "high|medium|low",
  "person": "相关人员（如有）",
  "remind_time": "提醒时间 ISO 格式（如有明确时间）"
}

分类规则：
- work: 工作相关，如会议、报告、项目、任务
- life: 生活相关，如健身、购物、旅行、学习
- family: 家庭相关，如家人聚餐、孩子学校、家庭事务

优先级规则：
- high: 紧急且重要，如截止日期、重要会议、紧急事务
- medium: 重要但不紧急，如计划、安排、常规事务
- low: 不紧急也不重要，如日常记录、备忘

请只返回 JSON，不要其他内容。

**重要：日期识别规则**
- 如果用户说"今天"，使用当前日期 ${new Date().toISOString().split('T')[0]}
- 如果用户说"明天"，使用明天的日期
- 如果用户说"后天"，使用后天的日期
- 如果用户说"下周X"，计算对应的日期
- 如果用户说"X天后"，计算对应的日期
- 如果用户只说了时间（如"下午3点"），使用今天的日期加上该时间
- 如果用户没有提到任何时间信息，不要返回 remind_time 字段

**当前日期**: ${new Date().toISOString().split('T')[0]}`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: text },
    ];

    const response = await llmClient.invoke(messages, {
      model: "doubao-seed-2-0-lite-260215",
      temperature: 0.3,
    });

    // 解析 JSON 响应
    let result;
    try {
      // 提取 JSON 部分
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(response.content);
      }
    } catch {
      return res.status(500).json({ error: "AI 响应解析失败" });
    }

    res.json(result);
  } catch (error) {
    console.error("LLM error:", error);
    res.status(500).json({ error: "AI 分类失败" });
  }
});

// POST /api/v1/ai/smart-create - 智能创建事件（语音/文本 + 自动分类 + 保存）
router.post("/smart-create", upload.single("audio"), async (req: Request, res: Response) => {
  try {
    let text = req.body.text;

    // 如果有音频文件，先进行语音识别
    if (req.file) {
      const audioPath = req.file.path;
      const audioBuffer = fs.readFileSync(audioPath);
      const audioBase64 = audioBuffer.toString("base64");

      const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
      const config = new Config();
      const asrClient = new ASRClient(config, customHeaders);

      const asrResult = await asrClient.recognize({
        uid: "memokeep-user",
        base64Data: audioBase64,
      });

      text = asrResult.text;
      fs.unlinkSync(audioPath);
    }

    if (!text) {
      return res.status(400).json({ error: "请提供文本内容或音频文件" });
    }

    // 调用 AI 分类
    const classifyHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const classifyConfig = new Config();
    const llmClient = new LLMClient(classifyConfig, classifyHeaders);

    const currentDate = new Date();
    const currentDateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTimeStr = currentDate.toTimeString().slice(0, 5); // HH:MM

    const systemPrompt = `你是一个智能事件分类助手。请分析用户输入的内容，提取事件信息并返回 JSON 格式。

当前日期：${currentDateStr}（${['日', '一', '二', '三', '四', '五', '六'][currentDate.getDay()]}）
当前时间：${currentTimeStr}（24 小时制）

返回格式：
{
  "title": "事件标题（简短）",
  "description": "事件描述（可选）",
  "category": "work/life/family",
  "priority": "high/medium/low",
  "person": "相关人员（可选）",
  "remind_time": "提醒时间 ISO 格式（可选，格式：YYYY-MM-DDTHH:MM:00Z）"
}

分类规则：
- work: 工作相关（会议、项目、报告、客户等）
- life: 生活相关（购物、健身、娱乐、个人事务等）
- family: 家庭相关（家人、孩子、家庭活动等）

优先级规则：
- high: 紧急重要（截止日期近、重要会议等）
- medium: 一般重要
- low: 不紧急

时间识别规则（非常重要）：
1. 用户输入的时间如果是 24 小时制（如 14:35、18:00、22:00），直接使用，不要转换
2. 如果用户输入的是 12 小时制（如下午 2:35、晚上 8 点、上午 9 点），需要转换为 24 小时制
   - 上午/早上 + 时间 = 直接使用（上午 9 点 = 09:00）
   - 下午/晚上 + 时间 = 加 12 小时（下午 2:35 = 14:35，晚上 8 点 = 20:00）
   - 中午 12 点 = 12:00
3. "今天"、"今日" = ${currentDateStr}
4. "明天"、"明日" = 明天的日期
5. "后天" = 后天的日期
6. 如果只说了时间没说日期，默认是今天
7. remind_time 必须是 ISO 格式：YYYY-MM-DDTHH:MM:00Z

示例：
- "14:35 取外卖" → remind_time: "${currentDateStr}T14:35:00Z"（下午 2 点 35 分，不是晚上 10 点 35 分）
- "下午 3 点开会" → remind_time: "${currentDateStr}T15:00:00Z"
- "晚上 8 点健身" → remind_time: "${currentDateStr}T20:00:00Z"
- "上午 9 点会议" → remind_time: "${currentDateStr}T09:00:00Z"
- "明天 14:35 取外卖" → remind_time: 明天的日期 + "T14:35:00Z"

请只返回 JSON，不要其他内容。`;

    const userPrompt = `请分析以下内容：${text}`;

    const response = await llmClient.invoke(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { model: "doubao-seed-2-0-lite-260215" }
    );

    let aiResult;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      } else {
        aiResult = JSON.parse(response.content);
      }
    } catch {
      return res.status(500).json({ error: "AI 响应解析失败" });
    }

    // 保存事件到数据库
    const supabase = getSupabaseClient();
    const { data: event, error } = await supabase
      .from("events")
      .insert({
        title: aiResult.title || text.slice(0, 50),
        description: aiResult.description || null,
        category: aiResult.category || "life",
        priority: aiResult.priority || "medium",
        person: aiResult.person || null,
        remind_time: aiResult.remind_time || null,
        is_completed: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Save event error:", error);
      return res.status(500).json({ error: "保存事件失败" });
    }

    res.json({ event, text });
  } catch (error) {
    console.error("Smart create error:", error);
    res.status(500).json({ error: "智能创建失败" });
  }
});

// POST /api/v1/ai/generate-report - 生成报告
router.post("/generate-report", async (req: Request, res: Response) => {
  try {
    const { period, startDate, endDate } = req.body;
    if (!period || !startDate || !endDate) {
      return res.status(400).json({ error: "请提供报告周期和日期范围" });
    }

    const supabase = getSupabaseClient();

    // 查询指定日期范围内的事件
    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({ error: "查询事件失败" });
    }

    if (!events || events.length === 0) {
      return res.status(404).json({ error: "该时间段内没有事件记录" });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    const periodLabel = period === "monthly" ? "月度" : period === "quarterly" ? "季度" : "年度";

    const systemPrompt = `你是一个智能报告生成助手。请根据提供的事件数据，生成一份${periodLabel}报告。

报告格式：
{
  "title": "报告标题",
  "summary": "总体概述（100-200字）",
  "category_stats": {
    "work": { "count": 数量, "percentage": 百分比 },
    "life": { "count": 数量, "percentage": 百分比 },
    "family": { "count": 数量, "percentage": 百分比 }
  },
  "priority_stats": {
    "high": { "count": 数量, "percentage": 百分比 },
    "medium": { "count": 数量, "percentage": 百分比 },
    "low": { "count": 数量, "percentage": 百分比 }
  },
  "completed_count": 已完成数量,
  "pending_count": 待处理数量,
  "highlights": ["重要事件亮点1", "重要事件亮点2", "重要事件亮点3"],
  "suggestions": ["改进建议1", "改进建议2", "改进建议3"],
  "content": "详细报告内容（500-1000字，包含分类分析、优先级分析、完成情况、趋势分析等）"
}

请只返回 JSON，不要其他内容。`;

    const eventsText = events
      .map(
        (e: any) =>
          `- [${e.category}] ${e.title} (${e.priority}) ${e.is_completed ? "已完成" : "待处理"} - ${e.description || "无描述"}`
      )
      .join("\n");

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: `事件数据：\n${eventsText}` },
    ];

    const response = await llmClient.invoke(messages, {
      model: "doubao-seed-2-0-lite-260215",
      temperature: 0.5,
    });

    // 解析 JSON 响应
    let reportData;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        reportData = JSON.parse(jsonMatch[0]);
      } else {
        reportData = JSON.parse(response.content);
      }
    } catch {
      return res.status(500).json({ error: "报告生成失败" });
    }

    // 保存报告到数据库
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({
        type: "ai_generated",
        period,
        title: reportData.title,
        summary: reportData.summary,
        content: JSON.stringify(reportData),
        event_count: events.length,
      })
      .select()
      .single();

    if (reportError) {
      return res.status(500).json({ error: "保存报告失败" });
    }

    res.json(report);
  } catch (error) {
    console.error("Report generation error:", error);
    res.status(500).json({ error: "报告生成失败" });
  }
});

// GET /api/v1/ai/reports - 获取报告列表
router.get("/reports", async (req: Request, res: Response) => {
  try {
    const { period } = req.query;

    const supabase = getSupabaseClient();

    let query = supabase.from("reports").select("*").order("created_at", { ascending: false });

    if (period) {
      query = query.eq("period", period);
    }

    const { data: reports, error } = await query;

    if (error) {
      return res.status(500).json({ error: "查询报告失败" });
    }

    res.json(reports || []);
  } catch (error) {
    console.error("Reports query error:", error);
    res.status(500).json({ error: "查询报告失败" });
  }
});

export default router;
