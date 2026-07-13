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

请只返回 JSON，不要其他内容。`;

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
