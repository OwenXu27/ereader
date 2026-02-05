import { createLLMClient, type LLMConfig, type ChatMessage } from '../utils/llm-client';

// Default configuration from environment variables
const DEFAULT_CONFIG: LLMConfig = {
  apiUrl: import.meta.env?.VITE_MOONSHOT_CHAT_COMPLETIONS_URL || '/api/chat/completions',
  model: import.meta.env?.VITE_MOONSHOT_MODEL || 'kimi-k2-turbo-preview',
  temperature: (() => {
    const v = import.meta.env?.VITE_MOONSHOT_TEMPERATURE;
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) ? n : 0.3;
  })(),
};

export class TranslationError extends Error {
  readonly statusCode?: number;
  readonly isRetryable: boolean;

  constructor(message: string, statusCode?: number, isRetryable: boolean = false) {
    super(message);
    this.name = 'TranslationError';
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
  }
}

// ============================================
// 1. 段落翻译 Prompt - 优化版
// ============================================
const TRANSLATION_SYSTEM_PROMPT = `你是一位精通中英双语的文学翻译家，专精于将英文书籍翻译为流畅、优雅的中文。你的目标是让读者忘记这是在阅读译文。

## 核心翻译原则

1. **地道自然**
   - 消除翻译腔：不用「进行」「予以」「被...所」「的的不休」等欧化句式
   - 化被动为主动：It is widely acknowledged → 人们普遍认为 / 学界公认
   - 意译优先： capture the essence, not just words

2. **语言节奏**
   - 长句拆分：超过 35 字考虑断句，保持呼吸感
   - 避免连续使用「的」「了」「着」
   - 适当保留英文的节奏和韵律感

3. **语境适配**
   - 文学性文本：注重美感和意象传达
   - 学术/技术文本：准确优先，保留术语
   - 对话：口语化，符合人物身份

## 排版规范（严格遵守）

- 引号：中文直角引号「」『』，英文用弯引号 'single' "double"
- 中英混排：中文与英文/数字之间加空格（如：使用 AI 技术、第 3 章）
- 专有名词：首次出现用「中文译名（Original Term）」，如：冒名顶替综合症（Imposter Syndrome）
- 标点：省略号用……，破折号用——，不用 ... 或 ---
- 段落：保持原文段落结构，不要合并或拆分

## 输出要求

只输出翻译后的中文段落，不要：
- 添加解释或注释
- 输出原文对照
- 使用 markdown 代码块包裹

直接给出最自然的中文译文。`;

// ============================================
// 2. 阅读助手 Prompt - 优化版
// ============================================
const CHAT_SYSTEM_PROMPT = `你是一位博学的私人阅读导师，正在陪伴读者阅读一本英文书籍。你的角色是帮助读者跨越语言和文化障碍，深入理解文本。

## 核心能力

1. **词汇与表达**
   - 解释生词、短语、习语、俚语的含义和用法
   - 说明词语的语境义（非词典义）
   - 提供同义替换和常见搭配

2. **句法剖析**
   - 拆解长难句结构，标注主干和修饰成分
   - 解释特殊语法现象（倒装、省略、强调等）
   - 说明修辞手法及其效果

3. **文化与背景**
   - 历史事件、社会背景、文化典故
   - 作者信息、写作时代、文学流派
   - 引用的典故、圣经、神话、文学作品

4. **逻辑与论证**（非虚构类）
   - 梳理论证结构
   - 解释专业概念
   - 补充相关学科知识

## 回答风格

- **简洁精准**：控制在 200-400 字，直击要点
- **层次分明**：使用 1. 2. 3. 或 - 分点说明
- **循循善诱**：先给直观理解，再深入细节
- **坦诚谦逊**：不确定时明确说明，不编造

## 格式规范

- 引号：直角引号「」用于引用，『』用于嵌套
- 术语：中文译名（English Term）
- 代码/原文：用反引号包裹，如 \`original text\`
- 强调：用 **粗体** 标出关键概念

## 对话原则

- 如果用户只是问单词意思，给出简明释义 + 例句即可
- 如果用户询问复杂概念，先给概述再展开
- 主动关联前文已解释过的内容，避免重复
- 鼓励用户继续提问，保持对话连贯性`;

// ============================================
// 3. Quick Prompts - 结构化输出版
// ============================================

export const QUICK_PROMPTS = {
  /** 语法分析：结构化拆解句子 */
  grammar: (_text: string) => `请分析以上引用英文句子的语法结构：

**1. 主干提取**
找出主谓宾/主系表核心结构

**2. 修饰成分**
- 定语从句/分词短语修饰什么
- 状语表示时间、条件、原因还是其他
- 插入语的作用

**3. 难点解析**
如果有特殊语法现象（倒装、省略、虚拟等），在此说明

**4. 中文释义**
给出通顺自然的中文翻译

注意：用简洁的语言解释，不要写成长篇大论。`,

  /** 背景知识：深度解读 */
  background: (_text: string) => `请解读以上引用文字：

**1. 表面意思**
这段话在说什么？

**2. 隐含信息**
- 涉及什么历史背景、文化典故或专业知识？
- 作者想表达什么深层含义？
- 与上下文有什么关联？

**3. 延伸阅读**（可选）
如果涉及重要概念，简要补充说明

保持简洁，每个部分几句话即可。`,

  /** 词汇解析：深度学习 */
  vocabulary: (_text: string) => `请解释以上引用的词汇/表达：

请包括：
- 基本含义（中文）
- 在这个语境中的具体意思
- 常见用法或搭配
- 近义词辨析（如果有）`,

  /** 仅引用：带入上下文 */
  plain: (text: string) => text,
};

export type QuickPromptMode = 'grammar' | 'background' | 'plain';

// English versions of quick prompts
const QUICK_PROMPTS_EN = {
  grammar: (_text: string) => `Please analyze the grammar structure of the quoted English sentence:

**1. Core Structure**
Identify the subject-predicate-object/complement structure

**2. Modifiers**
- What do attributive clauses/participial phrases modify
- Does the adverbial indicate time, condition, cause, or other
- Function of parenthetical expressions

**3. Special Grammar**
Explain any special grammar phenomena (inversion, ellipsis, subjunctive, etc.)

**4. Chinese Translation**
Provide a smooth and natural Chinese translation

Note: Keep explanations concise and clear.`,

  background: (_text: string) => `Please interpret the quoted text:

**1. Surface Meaning**
What is this passage saying?

**2. Implicit Information**
- What historical background, cultural allusions, or professional knowledge is involved?
- What deeper meaning does the author want to express?
- How does it relate to the context?

**3. Extended Reading** (optional)
Briefly supplement explanations if important concepts are involved

Keep it concise, a few sentences for each section.`,

  vocabulary: (_text: string) => `Please explain the quoted vocabulary/expression:

Include:
- Basic meaning (in Chinese)
- Specific meaning in this context
- Common usage or collocations
- Synonym differentiation (if applicable)`,

  plain: (text: string) => text,
};

/**
 * Get Quick Prompt text based on mode and language
 */
export const getQuickPrompt = (mode: QuickPromptMode, selectedText: string, language: 'zh' | 'en' = 'zh'): string => {
  const prompts = language === 'en' ? QUICK_PROMPTS_EN : QUICK_PROMPTS;
  switch (mode) {
    case 'grammar':
      return prompts.grammar(selectedText);
    case 'background':
      return prompts.background(selectedText);
    case 'plain':
      return prompts.plain(selectedText);
    default:
      return selectedText;
  }
};

// ============================================
// 导出类型
// ============================================

/**
 * Chat message type for conversation
 */
export interface ChatMessageType {
  role: 'user' | 'assistant';
  content: string;
}

// ============================================
// API 函数
// ============================================

/**
 * Translate text with automatic retry on transient failures
 */
export const translateText = async (
  text: string,
  apiUrl: string,
  apiKey: string
): Promise<string> => {
  const client = createLLMClient({
    ...DEFAULT_CONFIG,
    apiUrl: apiUrl || DEFAULT_CONFIG.apiUrl,
  }, apiKey);

  try {
    return await client.chatCompletion(
      [
        { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      { temperature: DEFAULT_CONFIG.temperature }
    );
  } catch (error) {
    throw convertError(error);
  }
};

/**
 * Send a chat message and get a response
 */
export const sendChatMessage = async (
  messages: ChatMessageType[],
  apiUrl: string,
  apiKey: string,
  context?: string
): Promise<string> => {
  const client = createLLMClient({
    ...DEFAULT_CONFIG,
    apiUrl: apiUrl || DEFAULT_CONFIG.apiUrl,
  }, apiKey);

  const systemContent = context
    ? `${CHAT_SYSTEM_PROMPT}\n\n当前用户引用的文本：\n「${context}」`
    : CHAT_SYSTEM_PROMPT;

  const apiMessages: ChatMessage[] = [
    { role: 'system', content: systemContent },
    ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  try {
    return await client.chatCompletion(apiMessages, { temperature: 0.5 });
  } catch (error) {
    throw convertError(error);
  }
};

// Convert unknown error to TranslationError
function convertError(error: unknown): TranslationError {
  if (error instanceof TranslationError) {
    return error;
  }
  if (error instanceof Error) {
    return new TranslationError(error.message);
  }
  return new TranslationError('Unknown error');
}
