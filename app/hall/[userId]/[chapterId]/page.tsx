'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Chapter, ConversationMessage, NovelRecord } from '../../../types/db';

// 格式化核心人物信息函数
const formatMasterCharacterInfo = (content: string | null | undefined): string => {
  if (!content) return '';
  
  // 解析格式: 名字###白雨|||外貌特征###16 岁，156 cm，45 kg；
  const result: string[] = [];
  const sections = content.split('|||');
  
  sections.forEach(section => {
    const [key, value] = section.split('###');
    if (key && value) {
      // 确保中文冒号，统一格式
      const formattedKey = key.replace(/：$/, '') + '：';
      // 关键修改：将转义的换行符\n转换为实际换行符
      const processedValue = value.replace(/；$/, '').replace(/\\n/g, '\n');
      result.push(`• ${formattedKey} ${processedValue}`);
    }
  });
  
  return result.join('\n');
};

// 格式化其他人物信息函数
const formatMainCharacters = (characters: any): string => {
  if (!characters) return '';
  
  // 检查是否已经是字符串
  if (typeof characters === 'string') {
    try {
      // 尝试解析为JSON
      const parsed = JSON.parse(characters);
      if (Array.isArray(parsed)) {
        return formatCharactersArray(parsed);
      }
    } catch {
      // 如果解析失败，返回原始字符串（但要处理转义换行符）
      return characters.replace(/\\n/g, '\n');
    }
  }
  
  // 如果是数组
  if (Array.isArray(characters)) {
    return formatCharactersArray(characters);
  }
  
  return JSON.stringify(characters, null, 2).replace(/\\n/g, '\n');
};

// 格式化人物数组
const formatCharactersArray = (characters: Array<{name?: string; background?: string; [key: string]: any}>): string => {
  return characters.map((char, index) => {
    let result = `【人物${index + 1}】`;
    if (char.name) result += ` ${char.name}`;
    if (char.background) {
      // 关键修改：处理背景信息中的转义换行符
      const processedBackground = char.background.replace(/\\n/g, '\n');
      result += `\n${processedBackground}`;
    }
    // 添加其他可能的属性
    Object.entries(char).forEach(([key, value]) => {
      if (key !== 'name' && key !== 'background') {
        // 确保值是字符串并处理转义换行符
        const processedValue = String(value).replace(/\\n/g, '\n');
        result += `\n${key}：${processedValue}`;
      }
    });
    return result;
  }).join('\n\n');
};

// 可折叠的世界面板项组件
const WorldPanelItem = ({ 
  title, 
  content, 
  placeholder, 
  style, 
  formatter 
}: { 
  title: string; 
  content: any; 
  placeholder: string; 
  style?: React.CSSProperties; 
  formatter?: (content: any) => string;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 获取显示内容，处理null/undefined情况并应用格式化
  const rawContent = content || placeholder;
  const displayContent = formatter ? formatter(rawContent) : (rawContent?.toString() || placeholder);
  
  // 如果内容为空或只有占位文本，则不显示展开按钮
  const hasContent = content != null && content !== '';
  
  // 截取内容开头作为预览（最多100个字符）
  const preview = displayContent.length > 100 
    ? displayContent.substring(0, 100) + '...' 
    : displayContent;
  
  return (
    <div style={style}>
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#6b7280',
          fontWeight: 500,
          marginBottom: 4,
          cursor: hasContent ? 'pointer' : 'default'
        }}
        onClick={() => hasContent && setIsExpanded(!isExpanded)}
      >
        <span>{title}：</span>
        {hasContent && (
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            {isExpanded ? '收起 ▲' : '展开 ▼'}
          </span>
        )}
      </div>
      <div 
        style={{
          whiteSpace: 'pre-wrap', 
          color: '#111827',
          fontSize: 14,
          maxHeight: isExpanded ? 'none' : '60px',
          overflow: isExpanded ? 'visible' : 'hidden',
          lineHeight: 1.5
        }}
      >
        {isExpanded ? displayContent : preview}
      </div>
    </div>
  );
};

export default function ChapterPage() {
  const params = useParams<{ userId: string; chapterId: string }>();
  const userId = params.userId;
  const chapterId = params.chapterId;

  const [chapter, setChapter] = useState<Partial<Chapter> | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [novels, setNovels] = useState<NovelRecord[]>([]);
  // 新增：世界与章节上下文（供 LLM 使用）
  const [worldContext, setWorldContext] = useState<{worldview?: string;
    master_sitting?: string; // 从 world.master_setting 映射
    main_characters?: any;
  } | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  // 新增：剧情分析相关状态
  const [storyAnalysis, setStoryAnalysis] = useState<string>('');
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [lastAnalysisCount, setLastAnalysisCount] = useState<number>(0);

  // 新增：故事弹窗相关状态
  const [selectedNovel, setSelectedNovel] = useState<NovelRecord | null>(null);
  const [isNovelModalOpen, setIsNovelModalOpen] = useState<boolean>(false);
  
  // 新增：剧情引导输入状态
  const [storyGuide, setStoryGuide] = useState<string>('');
  const [isSavingGuide, setIsSavingGuide] = useState<boolean>(false);

  // 建议面板状态
  const [suggestions, setSuggestions] = useState<Array<{ content: string }>>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState<boolean>(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  // 占位气泡临时ID序列与初始化标记
  const [tempIdSeq, setTempIdSeq] = useState<number>(-1);
  const [initializedInput, setInitializedInput] = useState<boolean>(false);

  // 打开故事详情弹窗
  const openNovelModal = (novel: NovelRecord) => {
    setSelectedNovel(novel);
    setIsNovelModalOpen(true);
  };

  // 关闭故事详情弹窗
  const closeNovelModal = () => {
    setIsNovelModalOpen(false);
    setSelectedNovel(null);
  };

  // 保持消息按 id 升序；临时负 id 的占位气泡固定排在列表底部
  const sortByIdAsc = (arr: ConversationMessage[]) =>
    arr.slice().sort((a, b) => {
      const aTemp = a.id < 0;
      const bTemp = b.id < 0;
      if (aTemp && !bTemp) return 1;   // 负 id（占位）排在后面
      if (!aTemp && bTemp) return -1;  // 正常消息排在前面
      return a.id - b.id;              // 同类之间仍按 id 升序
    });

  // 插入一个用于输入的空气泡（占位）并进入编辑模式
  const addEmptyInputBubble = () => {
    const tempId = tempIdSeq;
    const placeholder: ConversationMessage = {
      id: tempId,
      chapter_id: Number(chapterId),
      user_id: Number(userId),
      role: 'user',
      content: '',
      create_time: new Date().toISOString(),
    };
    setMessages((prev) => sortByIdAsc([...prev, placeholder]));
    setEditingId(tempId);
    setEditText('');
    setTempIdSeq((prev) => prev - 1);
  };

  // 加载章节信息
  useEffect(() => {
    let cancelled = false;
    const loadChapter = async () => {
      console.log('[CHAPTER] fetching detail', { chapterId });
      try {
        const res = await fetch(`/api/db/chapters/${chapterId}`);
        console.log('[CHAPTER] response status', res.status);
        if (!res.ok) throw new Error('暂无章节详情接口');
        const data = await res.json();
        console.log('[CHAPTER] response body', data);
        if (!cancelled) {
          setChapter(data as Chapter);
          const ctx = {
            worldview: (data as any).worldview,
            master_sitting: (data as any).master_sitting,
            main_characters: (data as any).main_characters,
          };
          setWorldContext(ctx);
          console.log('[CTX] worldContext set', ctx);
        }
      } catch (e) {
        console.error('[CHAPTER] fetch failed', e);
        if (!cancelled) {
          setChapter({
            id: Number(chapterId),
            name: `章节 ${chapterId}`,
            background: '（暂未获取到背景信息）',
          });
          setWorldContext({
            worldview: undefined,
            master_sitting: undefined,
            main_characters: undefined,
          });
          console.warn('[CTX] worldContext reset to undefined');
        }
      }
    };
    loadChapter();
    return () => {
      cancelled = true;
      console.log('[CHAPTER] effect cleanup; cancelled = true');
    };
  }, [chapterId]);

  // 加载消息
  useEffect(() => {
    let cancelled = false;
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/db/chapters/${chapterId}/messages`);
        if (!res.ok) throw new Error('获取消息失败');
        const data = (await res.json()) as ConversationMessage[];
        if (!cancelled) setMessages(sortByIdAsc(data));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '获取消息异常');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  // 首次进入页面后，消息加载完成即插入一个空气泡供用户输入
  useEffect(() => {
    if (!loading && !error && !initializedInput) {
      addEmptyInputBubble();
      setInitializedInput(true);
    }
  }, [loading, error, initializedInput]);

  // 加载小说记录
  useEffect(() => {
    let cancelled = false;
    const loadNovels = async () => {
      try {
        const res = await fetch(`/api/db/chapters/${chapterId}/novels`);
        if (!res.ok) throw new Error('获取小说失败');
        const data = (await res.json()) as NovelRecord[];
        if (!cancelled) setNovels(data);
      } catch (e) {
        // 小说列表失败不阻塞主区域
        console.error(e);
      }
    };
    loadNovels();
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  // 根据当前可编辑气泡生成写作建议
  const fetchSuggestions = async () => {
    if (editingId == null) return;
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      const editedMsg = messages.find((m) => m.id === editingId);
      const baseMsgs =
        editedMsg?.role === 'user' ? messages.filter((m) => m.id !== editingId) : messages;

      // 仅使用已入库消息；按 id 升序取最近30条
      const canonical = baseMsgs.filter((m) => m.id > 0);
      const recent = sortByIdAsc(canonical).slice(Math.max(0, canonical.length - 30));
      const history = recent.map((m) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content,
      }));
      console.log('[CTX] worldContext is ：', worldContext);

      const res = await fetch(`/api/chat/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          worldview: worldContext?.worldview,
          master_sitting: worldContext?.master_sitting,
          main_characters: worldContext?.main_characters,
          background: chapter?.background,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === 'string' ? data.error : data?.error?.message || '建议接口错误'
        );
      }

      if (Array.isArray(data?.suggestions)) {
        setSuggestions(data.suggestions as Array<{ content: string }>);
      } else if (typeof data?.raw === 'string') {
        setSuggestions([{ content: data.raw }]);
      } else {
        setSuggestions([]);
      }
    } catch (e) {
      setSuggestionsError(e instanceof Error ? e.message : '获取建议异常');
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // 当进入编辑态（包括首次创建输入气泡、AI回复后创建输入气泡、回溯进入编辑模式）自动拉取建议
  useEffect(() => {
    if (editingId != null) {
      fetchSuggestions();
    }
  }, [editingId]);

  // 初始化时检查是否已有消息，如果有足够消息则进行分析
  useEffect(() => {
    if (!loading && messages.length >= 30 && lastAnalysisCount === 0) {
      // 延迟分析，避免阻塞初始化
      setTimeout(() => analyzeCurrentStory(), 1000);
    }
  }, [loading, messages.length, lastAnalysisCount]);

  // 回溯：删除该消息及之后所有（数据库删除，前端保留当前行，并进入编辑模式）
  const handleRollback = async (fromId: number) => {
    // 若回溯到占位气泡（负ID），仅前端移除并退出编辑
    if (fromId < 0) {
      setMessages((prev) => prev.filter((m) => m.id !== fromId));
      if (editingId === fromId) {
        setEditingId(null);
        setEditText('');
      }
      return;
    }
    try {
      // 记录回溯前的消息数量
      const beforeRollbackCount = messages.filter(m => m.id > 0).length;
      
      await fetch(`/api/db/chapters/${chapterId}/messages?id=${fromId}`, { method: 'DELETE' });
      const currentIndex = messages.findIndex((m) => m.id === fromId);
      const current = currentIndex >= 0 ? messages[currentIndex] : undefined;
      // 前端按索引截断，删除其后的所有项（包括占位气泡），并保持排序
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === fromId);
        if (idx === -1) return sortByIdAsc(prev.filter((m) => m.id <= fromId));
        return sortByIdAsc(prev.slice(0, idx + 1));
      });
      setEditingId(fromId);
      // 移除前缀，让用户编辑时不看到"正文："或"开场白："
      setEditText(current?.content.replace(/^(正文：|开场白：)/, '') ?? '');
      
      // 重新获取消息，计算回溯后的消息数量
      const histRes = await fetch(`/api/db/chapters/${chapterId}/messages`);
      const allMsgs = (await histRes.json()) as ConversationMessage[];
      const canonical = allMsgs.filter((m) => m.id > 0);
      const afterRollbackCount = canonical.length;
      
      // 只有当回溯导致消息数量发生显著变化且消息数量大于30时，才考虑重新分析
      // 注意：不清除现有的分析结果，让用户在编辑时仍然可以参考
      const messageCountDiff = beforeRollbackCount - afterRollbackCount;
      if (afterRollbackCount >= 30 && messageCountDiff > 5 && !analysisLoading) {
        // 延迟分析，让用户有时间编辑
        setTimeout(() => analyzeCurrentStory(), 1000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 新增：分析当前剧情的函数
  const analyzeCurrentStory = async () => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      // 获取所有已入库的消息（按ID升序）
      const histRes = await fetch(`/api/db/chapters/${chapterId}/messages`);
      const allMsgs = (await histRes.json()) as ConversationMessage[];
      if (!histRes.ok) {
        throw new Error('获取消息失败');
      }
      const canonical = allMsgs.filter((m) => m.id > 0);
      const ordered = sortByIdAsc(canonical);
      const history = ordered.map((m) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content,
      }));

      // 调用剧情分析接口
      const analyzeRes = await fetch(`/api/chat/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          worldview: worldContext?.worldview,
          master_sitting: worldContext?.master_sitting,
          main_characters: worldContext?.main_characters,
          background: chapter?.background,
        }),
      });
      
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) {
        throw new Error(analyzeData?.error || '剧情分析失败');
      }

      // 保存分析结果
      setStoryAnalysis(analyzeData?.analysis || '');
      // 更新最后分析时的消息数量，使用30的倍数作为标记
      // 这样可以确保在60轮等正确轮次触发分析
      const count = ordered.length;
      const roundedCount = Math.floor(count / 30) * 30;
      setLastAnalysisCount(roundedCount > 0 ? roundedCount : count);
      
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : '分析异常');
    } finally {
      setAnalysisLoading(false);
    }
  };

  // 提交编辑：按 Enter 将该行内容 POST 为新消息，然后调用聊天接口生成下一行AI气泡并入库
  const handleCommitEdit = async () => {
    if (editingId == null || saving) return;
    setSaving(true);
    try {
      // 1) 先将该行内容作为“用户消息”保存进数据库
      const userRes = await fetch(`/api/db/chapters/${chapterId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(userId),
          role: 'user',
          // 在用户输入内容前添加"正文"前缀，先去掉已存在的前缀避免重复
          content: `正文：${editText.replace(/^正文：/, '')}`,
        }),
      });
      const createdUserMsg = await userRes.json();
      if (!userRes.ok) {
        throw new Error(createdUserMsg?.error || '保存用户消息失败');
      }

      // 用返回的入库结果替换当前编辑的气泡（更新 id、时间等）
      setMessages((prev) =>
        prev.map((m) => (m.id === editingId ? { ...m, ...createdUserMsg } : m))
      );
      setEditingId(null);

      // 2) 获取近30条消息，作为聊天接口的上下文（只使用已入库，按 id 升序）
      const histRes = await fetch(`/api/db/chapters/${chapterId}/messages`);
      const allMsgs = (await histRes.json()) as ConversationMessage[];
      if (!histRes.ok) {
        throw new Error('获取近30条消息失败');
      }
      const canonical = allMsgs.filter((m) => m.id > 0);
      const recent = sortByIdAsc(canonical).slice(Math.max(0, canonical.length - 30));
      const history = recent.map((m) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content,
      }));

      // 3) 调用聊天接口，生成AI回复，并添加为下一行气泡；随后也入库
      const chatRes = await fetch(`/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          worldview: worldContext?.worldview,
          master_sitting: worldContext?.master_sitting,
          main_characters: worldContext?.main_characters,
          background: chapter?.background,
          story_analysis: storyAnalysis, // 传入剧情分析结果
          story_guide: storyGuide, // 传入剧情引导内容
        }),
      });
      const chatData = await chatRes.json();
      if (!chatRes.ok) {
        const msg =
          typeof chatData?.error === 'string'
            ? chatData.error
            : chatData?.error?.message || '聊天接口调用失败';
        throw new Error(msg);
      }
      const aiContent: string = chatData.response ?? '';

      // 将AI回复保存到数据库
      const aiSaveRes = await fetch(`/api/db/chapters/${chapterId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(userId),
          role: 'ai',
          // 在AI回复内容前添加"正文"前缀，先去掉已存在的前缀避免重复
          content: `正文：${aiContent.replace(/^正文：/, '')}`,
        }),
      });
      const createdAiMsg = await aiSaveRes.json();
      if (!aiSaveRes.ok) {
        throw new Error(createdAiMsg?.error || '保存AI消息失败');
      }

      // 在前端追加AI气泡（保持按 id 升序）
      setMessages((prev) => sortByIdAsc([...prev, createdAiMsg]));

      // 检查是否需要进行剧情分析（每30轮对话进行一次）
      const updatedCanonical = [...canonical, createdAiMsg];
      const messageCount = updatedCanonical.length;
      
      // 确保在30、60、90等每30的倍数时都触发分析
      // 添加分析中状态检查，避免重复触发
      // 优化触发条件，确保在正确的轮次触发
      const targetRound = Math.floor(messageCount / 30) * 30;
      const shouldTriggerAnalysis = 
        !analysisLoading &&  // 确保分析不在进行中
        messageCount >= 30 &&  // 至少需要30条消息
        (targetRound > 0 && targetRound !== lastAnalysisCount ||  // 达到新的30倍数轮次
         lastAnalysisCount === 0 ||  // 首次有足够消息
         messageCount < lastAnalysisCount);  // 回溯后重新达到30行
      
      if (shouldTriggerAnalysis) {
        // 延迟分析，避免阻塞UI
        setTimeout(() => analyzeCurrentStory(), 500);
      }

      // AI回复后，立即插入一个新的空气泡让用户继续输入
      addEmptyInputBubble(); // 进入编辑态后 useEffect 会自动拉取建议
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交异常');
    } finally {
      setSaving(false);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommitEdit();
    }
  };

  // 新增：生成故事状态与预览
  const [generatingStory, setGeneratingStory] = useState<boolean>(false);
  const [generateStoryError, setGenerateStoryError] = useState<string | null>(null);
  const [generatedStoryContent, setGeneratedStoryContent] = useState<string | null>(null);
  const [generateStoryTitle, setGenerateStoryTitle] = useState<string | null>(null);

  // 生成故事逻辑
  const handleGenerateStory = async () => {
    if (generatingStory) return;
    setGeneratingStory(true);
    setGenerateStoryError(null);
    try {
      // 1) 拉取全部对话内容并拼接为 prompt（只用已入库消息，按 id 升序）
      const msgRes = await fetch(`/api/db/chapters/${chapterId}/messages`);
      const msgs = (await msgRes.json()) as ConversationMessage[];
      if (!msgRes.ok) throw new Error('获取消息失败');

      const canonical = msgs.filter((m) => m.id > 0);
      const ordered = sortByIdAsc(canonical);
      const prompt = ordered.map((m) => m.content).join('\n');

      // 2) 生成故事（调用后端 /api/novel）
      const novelRes = await fetch(`/api/novel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          worldview: worldContext?.worldview,
          master_sitting: worldContext?.master_sitting,
          main_characters: worldContext?.main_characters,
          background: chapter?.background,
        }),
      });
      const novelData = await novelRes.json();
      if (!novelRes.ok) {
        const msg =
          typeof novelData?.error === 'string'
            ? novelData.error
            : novelData?.error?.message || '生成故事失败';
        throw new Error(msg);
      }
      const content: string = novelData?.response ?? novelData?.content ?? '';
      if (!content) throw new Error('生成结果为空');

      // 生成标题（取第一行或默认）
      const title =
        (content.split('\n').find((line) => line.trim().length) || 'AI故事').slice(0, 50);

      // 3) 保存到数据库
      const saveRes = await fetch(`/api/db/chapters/${chapterId}/novels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(userId),
          title,
          content,
        }),
      });
      const saved = await saveRes.json();
      if (!saveRes.ok) {
        throw new Error(saved?.error || '保存故事失败');
      }

      // 4) 更新前端：预览 + 列表追加
      setNovels((prev) => [saved, ...prev]);
    } catch (e) {
      setGenerateStoryError(e instanceof Error ? e.message : '生成故事异常');
    } finally {
      setGeneratingStory(false);
    }
  };

  // 故事详情弹窗组件
  const NovelDetailModal = () => {
    if (!isNovelModalOpen || !selectedNovel) return null;

    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px',
        }}
        onClick={closeNovelModal}
      >
        <div 
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          }}
          onClick={(e) => e.stopPropagation()} // 防止点击内容区域关闭弹窗
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>
              {selectedNovel.title || '未命名故事'}
            </h2>
            <button
              onClick={closeNovelModal}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '4px',
              }}
            >
              &times;
            </button>
          </div>
          
          <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
            创建时间: {new Date(selectedNovel.create_time).toLocaleString()}
          </div>
          
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#111827' }}>
            {selectedNovel.content}
          </div>
        </div>
      </div>
    );
  };

  const sidebar = useMemo(() => {
    return (
      <aside
        style={{
          width: 320,
          borderLeft: '1px solid #eee',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          background: '#fafafa',
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <section
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 12,
            background: '#fff',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>章节简介</div>
          <div style={{ marginBottom: 6 }}>
            <span style={{ color: '#6b7280' }}>名称：</span>
            <span>{chapter?.name ?? `章节 ${chapterId}`}</span>
          </div>
          <div>
            <div style={{ color: '#6b7280', marginBottom: 4 }}>玩家信息：</div>
            <div style={{ whiteSpace: 'pre-wrap', color: '#111827' }}>
              {chapter?.background ?? '（暂未获取到玩家信息）'}
            </div>
          </div>
        </section>
        
        {/* 世界面板信息 - 可折叠 */}
        <section
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 12,
            background: '#fff',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>世界面板</div>
          
          {/* 世界观 - 可折叠 */}
          <WorldPanelItem 
            title="世界观" 
            content={worldContext?.worldview} 
            placeholder="暂未获取到世界观信息" 
          />
          
          {/* 核心人物 - 可折叠 */}
          <WorldPanelItem 
            title="核心人物" 
            content={worldContext?.master_sitting} 
            placeholder="暂未获取到核心人物信息" 
            style={{ marginTop: '12px' }} 
            formatter={formatMasterCharacterInfo}
          />
          
          {/* 其他人物 - 可折叠 */}
          <WorldPanelItem 
            title="其他人物" 
            content={worldContext?.main_characters}
            placeholder="暂未获取到其他人物信息" 
            style={{ marginTop: '12px' }} 
            formatter={formatMainCharacters}
          />
        </section>

        <section
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 12,
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 16 }}>故事集</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
            {novels.length === 0 ? (
              <div style={{ color: '#6b7280' }}>暂无故事记录</div>
            ) : (
              novels.map((n) => (
                <div
                  key={n.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    padding: 8,
                    background: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => openNovelModal(n)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#93c5fd';
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f0f9ff';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb';
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = '#fff';
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{n.title || '未命名故事'}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{new Date(n.create_time).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={handleGenerateStory}
            style={{
              marginTop: 8,
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              background: generatingStory ? '#f3f4f6' : '#f9fafb',
              cursor: generatingStory ? 'not-allowed' : 'pointer',
              color: generatingStory ? '#9ca3af' : '#374151',
            }}
            disabled={generatingStory}
          >
            {generatingStory ? '生成中...' : '生成故事'}
          </button>
          {generateStoryError && (
            <div style={{ color: '#ef4444', marginTop: 8 }}>{generateStoryError}</div>
          )}
        </section>
      </aside>
    );
  }, [chapter?.name, chapter?.background, novels, chapterId, generatingStory, generateStoryError]);

  const paper = useMemo(() => {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          padding: 24,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: 860,
            maxWidth: '100%',
            height: 'calc(100vh - 64px)',
            background: '#ffffff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.1)',
            borderRadius: 8,
            padding: 24,
            overflowY: 'auto',
          }}
        >
          {loading ? (
            <div style={{ color: '#6b7280' }}>加载中...</div>
          ) : error ? (
            <div style={{ color: '#ef4444' }}>{error}</div>
          ) : messages.length === 0 ? (
            <div style={{ color: '#6b7280' }}>暂无消息</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  onMouseEnter={() => setHoveredId(m.id)}
                  onMouseLeave={() => setHoveredId((prev) => (prev === m.id ? null : prev))}
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: '#ffffff', // 与 paper 背景一致
                    border: hoveredId === m.id ? '1px solid #9ca3af' : '1px solid transparent',
                    transition: 'border-color 120ms ease',
                    color: '#111827',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {editingId === m.id ? (
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        autoFocus
                        style={{
                          flex: 1,
                          border: '1px solid #d1d5db',
                          borderRadius: 6,
                          padding: '6px 8px',
                          outline: 'none',
                        }}
                        placeholder="编辑当前内容，按 Enter 提交"
                      />
                    ) : (
                      <div style={{ flex: 1, whiteSpace: 'pre-wrap' }}>
                        {m.content.replace(/^(正文：|开场白：)/, '')}
                      </div>
                    )}
                    {hoveredId === m.id && editingId !== m.id && (
                      <button
                        type="button"
                        onClick={() => handleRollback(m.id)}
                        style={{
                          padding: '4px 8px',
                          fontSize: 12,
                          borderRadius: 6,
                          border: '1px solid #e5e7eb',
                          background: '#ffffff',
                          color: '#374151',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }}
                        title="回溯到此处（删除之后所有行）"
                      >
                        回溯
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }, [messages, hoveredId, loading, error, editingId, editText, saving, generatedStoryContent, generateStoryTitle]);

  // 建议面板（位于写作区与右侧栏之间）
  // 左侧栏组件 - 包含剧情分析与剧情引导
  const leftSidebar = useMemo(() => {
    return (
      <aside
        style={{
          width: 320,
          borderRight: '1px solid #eee',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          background: '#fafafa',
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        {/* 目前剧情分析部分 */}
        <section
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 12,
            background: '#fff',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>目前剧情分析</div>
          {analysisLoading ? (
            <div style={{ whiteSpace: 'pre-wrap', color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>
              正在分析当前剧情发展...
            </div>
          ) : analysisError ? (
            <div style={{ whiteSpace: 'pre-wrap', color: '#ef4444', fontSize: 14, lineHeight: 1.5 }}>
              {analysisError}
            </div>
          ) : storyAnalysis ? (
            <div style={{ whiteSpace: 'pre-wrap', color: '#111827', fontSize: 14, lineHeight: 1.5, maxHeight: '400px', overflowY: 'auto' }}>
              {storyAnalysis}
            </div>
          ) : (
            <div style={{ whiteSpace: 'pre-wrap', color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>
              对话达到30轮后将自动进行剧情分析
            </div>
          )}
        </section>
        
        {/* 剧情引导部分 */}
        <section
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 12,
            background: '#fff',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>剧情引导</div>
          <div style={{ whiteSpace: 'pre-wrap', color: '#6b7280', fontSize: 14, lineHeight: 1.5, marginBottom: 8 }}>
            输入你想要引导的剧情方向，保存后将影响AI的回复生成
          </div>
          <textarea
            value={storyGuide}
            onChange={(e) => setStoryGuide(e.target.value)}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              resize: 'vertical',
              fontSize: 14,
              marginBottom: 8,
            }}
            placeholder="例如：希望角色之间产生冲突，或者推进某个关键情节..."
          />
          <button
            type="button"
            onClick={() => {
              setIsSavingGuide(true);
              // 模拟保存操作
              setTimeout(() => {
                setIsSavingGuide(false);
                alert('剧情引导已保存');
              }, 500);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              background: isSavingGuide ? '#f3f4f6' : '#f9fafb',
              cursor: isSavingGuide ? 'not-allowed' : 'pointer',
              color: isSavingGuide ? '#9ca3af' : '#374151',
            }}
            disabled={isSavingGuide}
          >
            {isSavingGuide ? '保存中...' : '保存引导'}
          </button>
          {storyGuide && (
            <div style={{ marginTop: 8, padding: 8, backgroundColor: '#f0f9ff', borderRadius: 4, fontSize: 13 }}>
              当前引导：{storyGuide.length > 50 ? storyGuide.substring(0, 50) + '...' : storyGuide}
            </div>
          )}
        </section>
      </aside>
    );
  }, [storyAnalysis, analysisLoading, analysisError, storyGuide, isSavingGuide]);

  const suggestionPanel = useMemo(() => {
    return (
      <aside
        style={{
          width: 280,
          borderLeft: '1px solid #e5e7eb',
          borderRight: '1px solid #e5e7eb',
          background: '#f8fafc',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 16 }}>灵感建议</div>
        {editingId == null ? (
          <div style={{ color: '#6b7280' }}>暂无编辑内容</div>
        ) : suggestionsLoading ? (
          <div style={{ color: '#6b7280' }}>生成建议中...</div>
        ) : suggestionsError ? (
          <div style={{ color: '#ef4444' }}>{suggestionsError}</div>
        ) : suggestions.length === 0 ? (
          <div style={{ color: '#6b7280' }}>暂无建议</div>
        ) : (
          suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setEditText(s.content)}
              style={{
                textAlign: 'left',
                padding: '8px 10px',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                background: '#ffffff',
                color: '#111827',
                cursor: 'pointer',
              }}
              title="点击将建议填入输入气泡"
            >
              {s.content}
            </button>
          ))
        )}
      </aside>
    );
  }, [editingId, suggestions, suggestionsLoading, suggestionsError]);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {leftSidebar}
      {paper}
      {suggestionPanel}
      {sidebar}
      <NovelDetailModal />
    </div>
  );
}
