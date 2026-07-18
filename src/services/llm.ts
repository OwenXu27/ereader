import { createLLMClient, type LLMConfig, type ChatMessage } from '../utils/llm-client';

// Default configuration from environment variables
// 默认模型 kimi-k2.6：即 Kimi Code 文档中「关闭 thinking 的 K2.7 Code」的实际路由目标
const DEFAULT_CONFIG: LLMConfig = {
  apiUrl: import.meta.env?.VITE_MOONSHOT_CHAT_COMPLETIONS_URL || '/api/chat/completions',
  model: import.meta.env?.VITE_MOONSHOT_MODEL || 'kimi-k2.6',
  temperature: (() => {
    const v = import.meta.env?.VITE_MOONSHOT_TEMPERATURE;
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) ? n : 0.6;
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
// 1. 段落翻译 Prompt - 中文重写版
// ============================================
// 定位从「文学翻译家」改为「中文母语作家重写」，配合正反例，
// 实测对消除直译腔效果明显（对照测试：盖茨比开篇/对话/非虚构）
const TRANSLATION_SYSTEM_PROMPT = `你是一位中文母语作家，正在把一本英文书**用中文重写**——不是翻译，而是假设这部作品本来就是用中文写的。读者的感受应该是「在读中文原著」，而不是「在读译著」。

## 重写原则

1. **得意忘形**
   - 先吃透原句的意思、语气、画面，然后抛开英文句式，用中文最自然的说法重新表达
   - 允许调整语序、拆并句子、转换词性、增删虚词，只要意思和情感不走样
   - 宁可改写，不可硬译

2. **戒除翻译腔**（以下都是病，见一个治一个）
   - 「的」字长链：我的父亲的建议 → 父亲给我的建议
   - 滥用「被」字：被他告知 → 他告诉我
   - 「当……的时候」：当我年轻的时候 → 我年轻那会儿
   - 代词扎堆：他告诉他他的想法 → 中文靠语境，能省则省
   - 「一个」泛滥：他是一个好人 → 他这人不错
   - 副词硬译：他很快地跑走了 → 他一溜烟跑了

3. **中文节奏**
   - 多用短句；长句要有呼吸，该断就断
   - 适当用四字格、对仗，但不过度雕琢
   - 对话要口语化，像人说话，不像字幕
   - 叙述要有文气，不写流水账

## 示例（仔细体会差距）

原文：The house was quiet, and the only sound was the ticking of the clock on the wall.
直译（不要这样）：房子里很安静，唯一的声音是墙上钟的滴答声。
重写（要这样）：屋里静极了，只听得见墙上的钟，滴答，滴答。

原文：She was breathing with difficulty, and the sweat was running down her face, but she kept on running.
直译（不要这样）：她呼吸困难，汗水顺着她的脸流下来，但她继续跑。
重写（要这样）：她喘不上气，汗珠子顺着脸往下淌，脚下却一刻没停。

## 排版规范（严格遵守）

- 引号：中文直角引号「」『』，英文用弯引号 'single' "double"
- 中英混排：中文与英文/数字之间加空格（如：使用 AI 技术、第 3 章）
- 专有名词：首次出现用「中文译名（Original Term）」，如：冒名顶替综合症（Imposter Syndrome）
- 标点：省略号用……，破折号用——，不用 ... 或 ---
- 段落：保持原文段落结构，不要合并或拆分

## 输出要求

只输出重写后的中文段落，不要解释、不要注释、不要原文对照、不要 markdown 代码块。直接给出译文。`;

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

// 网关对不同模型的 temperature 有强制约束（实测）：
// - kimi-k2.7 系列（thinking 常开）：只接受 1
// - kimi-k2.6 关闭 thinking 后：只接受 0.6
const resolveTemperature = (model: string | undefined, desired: number): number => {
  if (!model) return desired;
  if (model.includes('kimi-k2.7')) return 1;
  if (model.includes('kimi-k2.6')) return 0.6;
  return desired;
};

// kimi-k2.6 默认关闭 thinking（即 Kimi Code 中「K2.7 Code 关思考」的实际路由）
// 网关要求此时必须显式传 thinking.type=disabled，否则默认走思考模式
const resolveThinking = (model: string | undefined): LLMConfig['thinking'] | undefined =>
  model && model.includes('kimi-k2.6') ? { type: 'disabled' } : undefined;

const createClient = (apiUrl: string, apiKey: string, model?: string) => {
  const effectiveModel = model || DEFAULT_CONFIG.model;
  return {
    client: createLLMClient({
      ...DEFAULT_CONFIG,
      apiUrl: apiUrl || DEFAULT_CONFIG.apiUrl,
      model: effectiveModel,
      thinking: resolveThinking(effectiveModel),
    }, apiKey),
    effectiveModel,
  };
};

/**
 * Translate text with automatic retry on transient failures
 */
export const translateText = async (
  text: string,
  apiUrl: string,
  apiKey: string,
  model?: string
): Promise<string> => {
  const { client, effectiveModel } = createClient(apiUrl, apiKey, model);

  try {
    return await client.chatCompletion(
      [
        { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      { temperature: resolveTemperature(effectiveModel, DEFAULT_CONFIG.temperature) }
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
  context?: string,
  model?: string
): Promise<string> => {
  const { client, effectiveModel } = createClient(apiUrl, apiKey, model);

  const apiMessages = buildChatApiMessages(messages, context);

  try {
    return await client.chatCompletion(apiMessages, { temperature: resolveTemperature(effectiveModel, 0.5) });
  } catch (error) {
    throw convertError(error);
  }
};

/**
 * Send a chat message with streaming response
 */
export const sendChatMessageStream = async (
  messages: ChatMessageType[],
  apiUrl: string,
  apiKey: string,
  onChunk: (content: string) => void,
  context?: string,
  signal?: AbortSignal,
  model?: string
): Promise<string> => {
  const { client, effectiveModel } = createClient(apiUrl, apiKey, model);

  const apiMessages = buildChatApiMessages(messages, context);

  try {
    return await client.chatCompletionStream(apiMessages, onChunk, { temperature: resolveTemperature(effectiveModel, 0.5), signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw convertError(error);
  }
};

function buildChatApiMessages(messages: ChatMessageType[], context?: string): ChatMessage[] {
  const systemContent = context
    ? `${CHAT_SYSTEM_PROMPT}\n\n当前用户引用的文本：\n「${context}」`
    : CHAT_SYSTEM_PROMPT;

  return [
    { role: 'system', content: systemContent },
    ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];
}

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
