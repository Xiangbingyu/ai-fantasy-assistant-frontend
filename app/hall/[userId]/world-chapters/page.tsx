'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CreateWorldPayload, CreateChapterPayload } from '../../../types/db';

// 1. 扩展ChapterForm接口：新增apiId（存储后端返回的真实chapterId）
interface ChapterForm {
  id: string; // 前端临时ID（字符串）
  apiId?: number | null; // 后端真实ID（数字或null）
  name: string;
  opening: string;
  background: string;
  isSubmitted: boolean;
}

// 角色类型定义（与传递的结构匹配）
interface Character {
  world_id: number;
  id: number;
  name: string;
  background: string;
}


export default function WorldChaptersPage() {
  const searchParams = useSearchParams();
  const params = useParams<{ userId: string }>();
  const router = useRouter(); // 用于跳转
  const currentUserId = Number(params.userId || '0');

  // 【修改1：将enterFrom状态移到最顶部，确保先声明后使用】
  const [enterFrom, setEnterFrom] = useState<'sidebar' | 'card' | 'new' | 'unknown'>('unknown');
  // 1. 解析传递的数据结构：传递的章节需补全apiId和isSubmitted

  // 新增：章节创建成功的Toast状态
  const [showChapterToast, setShowChapterToast] = useState(false);
  // 移除hasCreatedChapters状态，不再需要单独控制添加章节按钮
  // 新增：章节删除加载状态（键=章节前端id，值=是否正在删除，防止重复点击）
  const [chapterDeletingIds, setChapterDeletingIds] = useState<Record<string, boolean>>({});

  // 其他状态（保持不变）
  const [worldLoading, setWorldLoading] = useState(false);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentWorldId, setCurrentWorldId] = useState<number | null>(null);
  // 新增：章节数据加载状态
  const [chapterDataLoading, setChapterDataLoading] = useState(false);
  // 【新增：8个对话主角设定的拆分状态】
  const [protagonistName, setProtagonistName] = useState(''); 
  const [protagonistAppearance, setProtagonistAppearance] = useState(''); // 外貌特征
  const [protagonistClothing, setProtagonistClothing] = useState(''); // 服饰风格
  const [protagonistBackground, setProtagonistBackground] = useState(''); // 人物背景
  const [protagonistPersonality, setProtagonistPersonality] = useState(''); // 性格特征
  const [protagonistLanguage, setProtagonistLanguage] = useState(''); // 语言风格
  const [protagonistBehavior, setProtagonistBehavior] = useState(''); // 行为逻辑
  const [protagonistPsychology, setProtagonistPsychology] = useState(''); // 心理特质

  // 【新增】解析后端返回的正则编码字符串，提取7个主角设定字段
  const parseMasterSetting = (encodedStr: string) => {

    interface FieldMap {
    '名字': string; // 新增名字的映射
    '外貌特征': string;
    '服饰风格': string;
    '人物背景': string;
    '性格特征': string;
    '语言风格': string;
    '行为逻辑': string;
    '心理特质': string;
    }

  // 字段映射：后端编码的key → 前端状态变量标识
  const fieldMap: FieldMap = {
    '名字': 'name', // 新增名字的前端状态标识
    '外貌特征': 'appearance',
    '服饰风格': 'clothing',
    '人物背景': 'background',
    '性格特征': 'personality',
    '语言风格': 'language',
    '行为逻辑': 'behavior',
    '心理特质': 'psychology'
  };

  // 初始化解析结果（默认空字符串，对应7个输入框）
  const result = {
    name: ' ', // 新增名字字段，默认空格避免未填写时覆盖
    appearance: '',
    clothing: '',
    background: '',
    personality: '',
    language: '',
    behavior: '',
    psychology: ''
  };

  // 若后端返回空字符串，直接返回默认结果
  if (!encodedStr.trim()) return result;
  console.log('解析master_setting字符串：', encodedStr);
  // 步骤1：按字段分隔符 ||| 拆分字符串
  const fieldArray = encodedStr.split('|||');

  // 步骤2：遍历每个字段，用正则提取key和value
  fieldArray.forEach(field => {
    // 修改正则表达式，使用[s\S]匹配所有字符（包括换行符）
    const match = field.match(/^(.+?)###([\s\S]+)$/);
    if (match) {
      const [, fieldKey, fieldValue] = match;
      // 关键：将 fieldKey 断言为 FieldMap 的合法键类型（keyof FieldMap）
      const validKey = fieldKey as keyof FieldMap;
      // 步骤3：将“未填写”转为空字符串
      const realValue = fieldValue === '未填写' ? '' : fieldValue;
      // 步骤4：还原换行符（将转义的换行符\n转回实际换行符）
      const restoredValue = realValue.replace(/\\n/g, '\n');
      // 步骤5：只有当键存在于 fieldMap 中时，才赋值（避免无效键）
      if (validKey in fieldMap) {
        result[fieldMap[validKey] as keyof typeof result] = restoredValue;
      }
    }
    });

    return result;
  }

  useEffect(() => {
  try {
    // 1. 仅解析2个必要参数：worldId（核心）和from（来源标识）
    const worldIdStr = searchParams.get('worldId');
    const from = searchParams.get('from') as 'sidebar' | 'card' | null;
    
    // 2. 处理worldId：转为数字，无效则设为null
    const worldId = worldIdStr ? (isNaN(Number(worldIdStr)) ? null : Number(worldIdStr)) : null;
    setCurrentWorldId(worldId); // 直接设置当前世界ID，无需依赖originWorldId
    
    // 3. 处理from：确定进入来源，默认unknown
    if (from === 'sidebar') {
      setEnterFrom('sidebar');
    } else if (from === 'card') {
      setEnterFrom('card');
    } else if (!worldId) { // 无worldId → 新建世界
      setEnterFrom('new');
    } else {
      setEnterFrom('unknown');
    }

    console.log('解析到的关键参数：', { worldId, from });

  } catch (err) {
    console.error('解析URL关键参数失败：', err);
    setCurrentWorldId(null);
    setEnterFrom('unknown');
  }
}, [searchParams]);

  // 新增：通过worldId获取该世界的章节数据
  const fetchWorldChapters = async (worldId: number) => {
    setChapterDataLoading(true);
    setError(null);

    try {
      // 根据访问来源决定是否传递creator_user_id参数
      // 从世界卡片进入时(enterFrom === 'card')不传递creator_user_id，这样非创造者也能看到章节
      const url = enterFrom === 'card' 
        ? `/api/db/worlds/${worldId}/chapters` 
        : `/api/db/worlds/${worldId}/chapters?creator_user_id=${currentUserId}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('加载章节数据失败');

      const chapterData = await res.json();
      console.log('从接口获取的章节数据：', chapterData);

      let formattedChapters: ChapterForm[] = [];
      if (chapterData.length === 0) {
        // 无章节时初始化默认章节
        formattedChapters = [{
          id: 'default-1',
          apiId: null,
          name: '',
          opening: '',
          background: '',
          isSubmitted: false
        }];
      } else {
        // 格式化接口返回的章节数据（匹配ChapterForm类型）
        formattedChapters = chapterData.map((ch: any) => ({
          id: ch.id?.toString() || Date.now().toString(), // 转为前端字符串ID
          apiId: ch.id ? Number(ch.id) : null, // 存储后端真实ID
          name: ch.name || '',
          opening: ch.opening || '',
          background: ch.background || '',
          isSubmitted: true // 接口返回的章节都是已提交的
        }));
      }

      setChapters(formattedChapters);
      // 移除setHasCreatedChapters调用，因为该状态变量已删除

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '加载章节时发生未知错误';
      setError(errMsg);
      console.error(errMsg, err);

      // 错误时初始化默认章节
      setChapters([{
        id: 'default-err-1',
        apiId: null,
        name: '',
        opening: '',
        background: '',
        isSubmitted: false
      }]);
    } finally {
      setChapterDataLoading(false);
    }
  };

  useEffect(() => {
    // 仅当worldId存在且非新建状态时，才请求数据
    if (!currentWorldId) return;

    const fetchWorldDetail = async () => {
    setWorldLoading(true); // 复用现有加载状态
    setError(null);

    try {
      // 调用接口获取世界详情（包含正则编码的master_setting）
      const res = await fetch(`/api/db/worlds/${currentWorldId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `获取世界ID:${currentWorldId}的详情失败`);
      }

      const worldDetail = await res.json();
      console.log('从接口获取的世界详情：', worldDetail);

      // --------------------------
      // 【关键新增】解析并填充7个输入框
      // --------------------------
      if (worldDetail.master_setting) {
        // 1. 调用解析函数，得到7个字段的具体值
        const parsedFields = parseMasterSetting(worldDetail.master_setting);
        // 2. 同步到7个输入框对应的状态（自动填充输入框）
        setProtagonistName(parsedFields.name);
        setProtagonistAppearance(parsedFields.appearance);
        setProtagonistClothing(parsedFields.clothing);
        setProtagonistBackground(parsedFields.background);
        setProtagonistPersonality(parsedFields.personality);
        setProtagonistLanguage(parsedFields.language);
        setProtagonistBehavior(parsedFields.behavior);
        setProtagonistPsychology(parsedFields.psychology);
      }

      // （原有逻辑：同步世界表单、角色、章节状态，保持不变）
      setWorldForm({
        user_id: currentUserId,
        name: worldDetail.name || '',
        tags: worldDetail.tags || [],
        is_public: worldDetail.is_public || false,
        worldview: worldDetail.worldview || '',
        master_setting: worldDetail.master_setting || '', // 保留原始编码字符串（可选）
        origin_world_id: worldDetail.origin_world_id || null,
        popularity: worldDetail.popularity || 0,
        characters: worldDetail.main_characters || []
      });

      const syncedCharacters = (worldDetail.main_characters || []).map((char: any, index: number) => ({
        id: index + 1,
        world_id: currentWorldId,
        name: char.name || '',
        background: char.background || ''
      }));
      setCharacters(syncedCharacters);

      fetchWorldChapters(currentWorldId);

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '获取世界详情异常';
      setError(errMsg);
      console.error(errMsg, err);
    } finally {
      setWorldLoading(false);
    }
  };

  fetchWorldDetail();
}, [currentWorldId, enterFrom, currentUserId]); // 依赖worldId和进入状态

  // 【新增：from是sidebar时，自动加载章节数据】
  useEffect(() => {
    // 仅在“从侧边栏进入”且“有世界ID”时执行
    if (enterFrom !== 'sidebar' || !currentWorldId) return;

    // 加载章节数据前，设置加载状态
    setChapterDataLoading(true);
    setError(null);

    fetchWorldChapters(currentWorldId);
  }, [enterFrom, currentWorldId]); // 依赖from和世界ID，变化时重新加载


  // 世界表单状态（保持不变）
  type WorldFormState = Omit<CreateWorldPayload, 'tags' | 'characters'> & {
    tags: string[];
    characters: { name: string; background: string }[];
  };

  const [worldForm, setWorldForm] = useState<WorldFormState>({
    user_id: currentUserId,
    name: '', // 空白初始值
    tags: [], // 空白初始值
    is_public: false,
    worldview: '', // 空白初始值
    master_setting: '', // 空白初始值
    origin_world_id: null,
    popularity: 0,
    characters: [] // 空白初始值
  });




  // 标签输入状态（完全不变）
  const [tagInput, setTagInput] = useState('');

  // 角色状态管理（完全不变）
  const [characters, setCharacters] = useState<Character[]>(() => {
    return [{ id: 1, world_id: 1, name: '', background: '' }];
  });


  // 章节表单状态：只保留一个章节，与世界一起创建
  const [chapters, setChapters] = useState<ChapterForm[]>([
    {
      id: '1',
      apiId: null,
      name: '',
      opening: '',
      background: '',
      isSubmitted: false
    }
  ]);


  // 以下基础方法（世界表单/标签/角色/章节修改）保持不变
  const handleWorldInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const field = target.name as 'name' | 'worldview' | 'master_setting' | 'is_public';
    const isCheckbox = target instanceof HTMLInputElement && target.type === 'checkbox';
    const nextValue = isCheckbox ? (target as HTMLInputElement).checked : target.value;

    setWorldForm(prev => ({
      ...prev,
      [field]: nextValue
    }));
  };

  const handleTagInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (tagInput.trim() && !worldForm.tags.includes(tagInput.trim())) {
      setWorldForm(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setWorldForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleCharacterChange = (id: string, field: 'name' | 'background', value: string) => {
    setCharacters(prev =>
      prev.map(char =>
        char.id === parseInt(id) ? { ...char, [field]: value } : char
      )
    );
  };

  const addCharacter = () => {
    const newId = Date.now();
    setCharacters(prev => [...prev, { id: newId, name: '', background: '', world_id: 1 }]);
  };

  const removeCharacter = (id: string) => {
    if (characters.length > 1) {
      setCharacters(prev => prev.filter(char => char.id !== parseInt(id)));
    }
  };

  const handleChapterChange = (id: string, field: 'name' | 'opening' | 'background', value: string) => {
    setChapters(prev =>
      prev.map(chapter =>
        chapter.id === id ? { ...chapter, [field]: value } : chapter
      )
    );
  };

  // 新增：添加章节函数
  const addChapter = () => {
    const newId = `chapter-${Date.now()}`;
    setChapters(prev => [...prev, {
      id: newId,
      apiId: null,
      name: '',
      opening: '',
      background: '',
      isSubmitted: false
    }]);
  };

  // 【关键修改1】修改removeChapter：新增后端DELETE请求逻辑（保持不变）
  const removeChapter = async (id: string) => {
    // 1. 根据前端id找到对应章节，获取后端真实apiId
    const chapter = chapters.find(ch => ch.id === id);
    if (!chapter) return;

    // 2. 防止重复点击（正在删除时不执行）
    if (chapterDeletingIds[id]) return;

    // 3. 弹出确认框，避免误删
    const isConfirm = window.confirm(`确定删除章节「${chapter.name || '未命名章节'}」？删除后关联的消息和小说也会同步删除！`);
    if (!isConfirm) return;

    // 4. 标记该章节为“正在删除”
    setChapterDeletingIds(prev => ({ ...prev, [id]: true }));
    setError(null);
    setSuccess(null);

    try {
      // 5. 调用后端DELETE接口（用章节的真实apiId）
      const response = await fetch(`/api/db/chapters/${chapter.apiId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const deleteData = await response.json();
      if (!response.ok) {
        throw new Error(deleteData.error || '删除章节失败');
      }

      // 6. 接口成功：删除前端章节列表中的该章节
      setChapters(prev => prev.filter(ch => ch.id !== id));
      // 7. 显示成功提示（包含后端返回的关联删除数据）
      setSuccess(`章节删除成功！已同步删除${deleteData.deleted_messages}条消息和${deleteData.deleted_novels}部小说`);
      setShowChapterToast(true);
      setTimeout(() => setShowChapterToast(false), 3000);

    } catch (err) {
      // 8. 接口失败：提示错误，不删除前端章节
      setError(err instanceof Error ? err.message : '删除章节时发生未知错误');
    } finally {
      // 9. 取消“正在删除”标记
      setChapterDeletingIds(prev => ({ ...prev, [id]: false }));
    }
  };

  // 提交世界表单（修改：汇总7个对话主角设定项，支持创建多个章节）
  const handleCreateWorld = async () => {
  
  setError(null);
  setSuccess(null);
  setWorldLoading(true);
  
  // 校验必填字段
  if (!worldForm.name.trim()) {
    setError('世界名称不能为空');
    setWorldLoading(false);
    return;
  }

  if (!protagonistName.trim()) {
    setError('主角名字不能为空');
    setWorldLoading(false);
    return;
  }

  // 校验所有章节名称必填
  const emptyNameChapters = chapters.filter(chapter => !chapter.name.trim());
  if (emptyNameChapters.length > 0) {
    setError('所有章节名称不能为空');
    setWorldLoading(false);
    return;
  }

  // 【正则化编码核心】按规则拼接七个字段
  const fields = [
    { key: '名字', value: protagonistName }, // 新增的名字字段
    { key: '外貌特征', value: protagonistAppearance },
    { key: '服饰风格', value: protagonistClothing },
    { key: '人物背景', value: protagonistBackground },
    { key: '性格特征', value: protagonistPersonality },
    { key: '语言风格', value: protagonistLanguage },
    { key: '行为逻辑', value: protagonistBehavior },
    { key: '心理特质', value: protagonistPsychology },
  ];

  // 拼接格式：key###value|||key###value...（空值用"未填写"）
  // 注意：对字段值中的换行符进行转义处理，避免影响分隔符
  const combinedMasterSetting = fields
    .map(field => {
      // 对字段值中的换行符进行转义，替换为\n字符串
      const escapedValue = (field.value || '未填写').replace(/\n/g, '\\n');
      return `${field.key}###${escapedValue}`;
    })
    .join('|||');

  // 提交给后端的参数
  const payload: CreateWorldPayload = {
    ...worldForm,
    user_id: currentUserId,
    master_setting: combinedMasterSetting, // 正则化后的字符串
    characters: characters.map(char => ({
      name: char.name,
      background: char.background
    }))
  };
  

    try {
      // 第一步：创建世界
      const worldResponse = await fetch('/api/db/worlds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const worldData = await worldResponse.json();

      if (!worldResponse.ok) {
        throw new Error(worldData.error || '创建世界失败');
      }

      // 用户-世界关联请求（保持不变）
      const worldId = worldData.id;
      const requestData = {
        user_id: currentUserId,
        world_id: worldId,
        role: "creator",
        create_time: new Date().toISOString()
      };

      const userWorldResponse = await fetch('/api/db/user-worlds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!userWorldResponse.ok) {
        const userWorldError = await userWorldResponse.json();
        console.warn('用户与世界关联失败：', userWorldError.error || '关联接口返回未知错误');
      } else {
        const userWorldData = await userWorldResponse.json();
        console.log('用户与世界关联成功：', userWorldData);
      }

      // 第二步：创建世界成功后，批量创建所有章节
      const createdChapters = [];
      
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const chapterPayload: CreateChapterPayload = {
          world_id: worldId,
          creator_user_id: currentUserId,
          name: chapter.name,
          opening: chapter.opening,
          background: chapter.background,
          is_default: i === 0, // 第一个章节设为默认章节
          origin_chapter_id: null
        };

        const chapterResponse = await fetch('/api/db/chapters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chapterPayload)
        });

        const chapterData = await chapterResponse.json();
        if (!chapterResponse.ok) {
          throw new Error(chapterData.error || `创建章节失败: ${chapter.name}`);
        }

        // 拿到章节真实ID
        const realChapterId = chapterData.id;
        console.log(`章节 "${chapter.name}" 创建成功，真实ID：${realChapterId}`);
        createdChapters.push({ ...chapter, apiId: realChapterId, isSubmitted: true });

        // 第三步：为每个章节创建初始消息
        if (chapter.opening) {
          const messagePayload = {
            user_id: currentUserId,
            role: "user",
            content: `${chapter.opening || '无'}`,
            create_time: new Date().toISOString()
          };

          const messageResponse = await fetch(`/api/db/chapters/${realChapterId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messagePayload)
          });

          if (messageResponse.ok) {
            const messageData = await messageResponse.json();
            console.log(`章节消息发送成功：`, messageData);
          } else {
            const messageError = await messageResponse.json();
            console.warn(`章节消息发送失败：`, messageError.error || '未知错误');
          }
        }
      }

      // 更新前端状态
      setCurrentWorldId(worldId);
      setChapters(createdChapters);
      // 如果用户是从公开世界卡片进入的，创建后更新状态为新建模式
      if (enterFrom === 'card') {
        setEnterFrom('new');
      }

      setSuccess('世界和章节创建成功！');
      setShowChapterToast(true);
      setTimeout(() => setShowChapterToast(false), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : '创建世界或章节时发生错误');
    } finally {
      setWorldLoading(false);
    }
  };

  // 移除handleCreateChapters函数，章节将与世界一起创建

  // 5. 章节跳转方法：拼接路径（/hall/用户ID/章节ID）（保持不变）
  const goToChapter = (chapterId: number) => {
    if (currentUserId && chapterId) {
      router.push(`/hall/${currentUserId}/${chapterId}`); // 跳转目标路径
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 transition-colors duration-300" style={{fontSize: '18px'}}>
      {/* Toast提示（保持不变） */}
      {showChapterToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {success}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* 幻境协创标志（保持不变） */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            margin: '0',
            letterSpacing: '-0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg "
              style={{ transition: 'transform 0.3s ease', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget as SVGElement).style.transform = 'rotate(5deg)'}
              onMouseLeave={(e) => (e.currentTarget as SVGElement).style.transform = 'rotate(0)'}
            >
              <path d="M20 20H4C3.4 20 3 19.6 3 19V5C3 4.4 3.4 4 4 4H18L21 7V19C21 19.6 20.6 20 20 20Z" stroke="url(#titleGradient)" strokeWidth="2"/>
              <path d="M16 2V6" stroke="url(#titleGradient)" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 11H16" stroke="url(#titleGradient)" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 15H13" stroke="url(#titleGradient)" strokeWidth="2" strokeLinecap="round"/>
              <defs>
                <linearGradient id="titleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1"/>
                  <stop offset="100%" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
            幻境协创
          </h1>
          <p style={{
            fontSize: '12px',
            color: '#64748b',
            margin: '0 0 0 12px',
            letterSpacing: '0.2px',
            alignSelf: 'flex-end',
            marginBottom: '2px'
          }}>
            和AI一起，把灵感写成小说
          </p>
        </div>

        {/* 页面标题（保持不变） */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-8 pb-2 border-b border-gray-200 dark:border-gray-700">
          世界与章节管理
        </h1>

        {/* 标题下方的提示区域 - 整合两个提示 */}
        <div className="space-y-4">
          {/* 侧边栏进入提示 */}
          {enterFrom === 'sidebar' && (
            <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 p-3 rounded-lg border border-blue-100 dark:border-blue-800/50">
              <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              欢迎回到你的世界！你可以直接进入你的章节，如果想要修改，需在修改完成后点击「创建世界和章节」
            </div>
          )}
          
          {/* 公开世界模板引用提示 - 模仿侧边栏提示格式但保持黄色 */}
          {enterFrom === 'card' && currentWorldId && (
            <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 p-3 rounded-lg border border-amber-100 dark:border-amber-800/50">
              <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              您正在引用公开世界模板（ID: {currentWorldId}），点击「创建世界和章节」按钮即可进入您的世界
            </div>
          )}
        </div>

        {/* 提示区域（保持不变） */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 p-4 rounded-lg mb-6 shadow-sm border border-rose-100 dark:border-rose-800/50 transition-all duration-300">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 p-4 rounded-lg mb-6 shadow-sm border border-emerald-100 dark:border-emerald-800/50 transition-all duration-300">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>{success}</span>
            </div>
          </div>
        )}

        {/* 创建世界板块（修改：对话主角设定全部改为input组件） */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8 transition-all duration-300 hover:shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            创建新世界
          </h2>

          <div className="space-y-5">
            {/* 创建世界表单内容（保持不变） */}
            <div>
              <label className="block text-xl font-medium text-gray-700 dark:text-gray-300 mb-1.5">世界名称 *</label>
              <input
                type="text"
                name="name"
                value={worldForm.name}
                onChange={handleWorldInputChange}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 outline-none"
                placeholder="输入世界名称（如：魔法大陆）"
              />
            </div>

            <div>
              <label className="block text-xl font-medium text-gray-700 dark:text-gray-300 mb-1.5">标签</label>
              <form onSubmit={handleTagInput} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 outline-none"
                  placeholder="输入标签后按回车添加（如：魔法、末世）"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all duration-200 flex items-center gap-1.5 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  添加
                </button>
              </form>

              <div className="flex flex-wrap gap-2.5">
                {worldForm.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full text-sm text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50 transition-all duration-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1.5 text-indigo-500 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors"
                      aria-label={`删除标签 ${tag}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="is_public"
                  checked={worldForm.is_public}
                  onChange={handleWorldInputChange}
                  className="w-4 h-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded transition-colors"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">设为公开世界（他人可查看）</span>
              </label>
            </div>

            <div>
              <label className="block text-xl font-medium text-gray-700 dark:text-gray-300 mb-1.5">世界观描述</label>
              <textarea
                name="worldview"
                value={worldForm.worldview}
                onChange={handleWorldInputChange}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 outline-none min-h-[120px] resize-none"
                placeholder="描述这个世界的基本设定和背景"
              />
            </div>

            {/* 【修改：对话主角设定全部改为input组件】 */}
            {/* 【修改：对话主角设定 - 优化输入框高度，保留自动换行】 */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">核心对话人物设定</h3>
              
              <div className="mb-3">
                <label className="block text-xl-text-gray-500 dark:text-gray-400 mb-1">名字（必填）</label>
                <input
                  type="text"
                  value={protagonistName}
                  onChange={(e) => setProtagonistName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 outline-none"
                  placeholder="请输入主角名字（如：艾德里安、林月）"
                  required
                />
              </div>
            </div>


            {/* 1. 外貌特征（可选）- 低初始高度，自动换行 */}
            <div className="mb-3">
              <label className="block text-xl text-gray-500 dark:text-gray-400 mb-1">外貌特征（可选）</label>
              <textarea
                value={protagonistAppearance}
                onChange={(e) => setProtagonistAppearance(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 outline-none resize-y"
                placeholder="如：银发紫眸、身高185cm、左脸颊有疤痕。可描述五官、身材、特殊标记等。"
                rows={4} 
              />
            </div>

            {/* 2. 服饰风格（可选）- 低初始高度，自动换行 */}
            <div className="mb-3">
              <label className="block text-xl text-gray-500 dark:text-gray-400 mb-1">服饰风格（可选）</label>
              <textarea
                value={protagonistClothing}
                onChange={(e) => setProtagonistClothing(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 outline-none resize-y"
                placeholder="如：复古宫廷风，常穿深蓝色刺绣马甲配白色蕾丝衬衫，腰间系鎏金怀表链。"
                rows={4}
              />
            </div>

            {/* 3. 人物背景（可选）- 稍高但不夸张，自动换行 */}
            <div className="mb-3">
              <label className="block text-xl text-gray-500 dark:text-gray-400 mb-1">人物背景（可选）</label>
              <textarea
                value={protagonistBackground}
                onChange={(e) => setProtagonistBackground(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 outline-none resize-y"
                placeholder="如：前帝国将军，因揭发宫廷阴谋被诬陷叛国罪流放。曾参与三次边境战争，手下有秘密亲兵。"
                rows={4} 
              />
            </div>

            {/* 4. 性格特征（可选）- 低初始高度，自动换行 */}
            <div className="mb-3">
              <label className="block text-xl text-gray-500 dark:text-gray-400 mb-1">性格特征（可选）</label>
              <textarea
                value={protagonistPersonality}
                onChange={(e) => setProtagonistPersonality(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 outline-none resize-y"
                placeholder="如：外冷内热，表面疏离，实则重视身边人。决策果断但不鲁莽，习惯观察细节。"
                rows={4}
              />
            </div>

            {/* 5. 语言风格（可选）- 低初始高度，自动换行 */}
            <div className="mb-3">
              <label className="block text-xl text-gray-500 dark:text-gray-400 mb-1">语言风格（可选）</label>
              <textarea
                value={protagonistLanguage}
                onChange={(e) => setProtagonistLanguage(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 outline-none resize-y"
                placeholder="如：说话简洁干练，少用修饰词，句尾常带反问。对长辈用敬语，态度直接。"
                rows={4}
              />
            </div>

            {/* 6. 行为逻辑（可选）- 低初始高度，自动换行 */}
            <div className="mb-3">
              <label className="block text-xl text-gray-500 dark:text-gray-400 mb-1">行为逻辑（可选）</label>
              <textarea
                value={protagonistBehavior}
                onChange={(e) => setProtagonistBehavior(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 outline-none resize-y"
                placeholder="如：遇危险先找掩体，再判断敌人弱点。决策前列利弊清单，优先低风险方案。"
                rows={4}
              />
            </div>

            {/* 7. 心理特质（可选）- 低初始高度，自动换行 */}
            <div>
              <label className="block text-xl text-gray-500 dark:text-gray-400 mb-1">心理特质（可选）</label>
              <textarea
                value={protagonistPsychology}
                onChange={(e) => setProtagonistPsychology(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 outline-none resize-y"
                placeholder="如：因童年被弃，缺乏安全感，通过掌控环境获稳定感。有正义感，常陷入亲友与正义的矛盾。"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-xl font-medium text-gray-700 dark:text-gray-300 mb-2.5">其余角色</label>

              {characters.map((char, index) => (
                <div key={char.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-3.5 bg-gray-50 dark:bg-gray-800/50 transition-all duration-200 hover:border-indigo-200 dark:hover:border-indigo-700/50">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium text-gray-800 dark:text-white">角色 {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeCharacter(char.id.toString())}
                      disabled={characters.length <= 1}
                      className="text-sm text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label={`删除角色 ${index + 1}`}
                    >
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      value={char.name}
                      onChange={(e) => handleCharacterChange(char.id.toString(), 'name', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 outline-none"
                      placeholder="角色名称"
                    />

                    <textarea
                      value={char.background}
                      onChange={(e) => handleCharacterChange(char.id.toString(), 'background', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 outline-none min-h-[90px] resize-none"
                      placeholder="角色背景故事"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addCharacter}
                className="mt-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 flex items-center gap-1.5 text-sm shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                + 添加角色
              </button>
            </div>


          </div>
        </div>



        {/* 章节管理板块：关键修改2——删除按钮添加enterFrom权限控制 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            章节信息（与世界一起创建）
          </h2>

          {/* 新建世界提示（保留） */}
          {enterFrom === 'new' && (
            <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 p-3 rounded-lg mb-4 border border-green-100 dark:border-green-800/50">
              <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
              </svg>
              请填写章节信息，将与世界一起创建
            </div>
          )}

          <div className="space-y-5">
            {currentWorldId && (
              <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700">
                <span className="font-medium text-gray-600 dark:text-gray-300">当前编辑的世界 ID:</span> {currentWorldId}
              </p>
            )}

            {/* 章节列表：【关键修改】删除按钮添加enterFrom === 'card' 禁用条件 */}
            {chapters.map((chapter, index) => (
              <div
                key={chapter.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-3.5 bg-gray-50 dark:bg-gray-800/50 transition-all duration-200 hover:border-emerald-200 dark:hover:border-emerald-700/50"
              >
                {/* 章节标题+状态+删除+跳转按钮 */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-800 dark:text-white">章节 {index + 1}</h3>
                    {/* 章节状态标签 */}
                    {chapter.isSubmitted && (
                      <span className="text-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                        已提交（ID: {chapter.apiId}）
                      </span>
                    )}
                    {index === 0 && !chapter.isSubmitted && (
                      <span className="text-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                        默认章节（未提交）
                      </span>
                    )}
                  </div>

                  {/* 操作按钮组：删除 + 跳转 */}
                  <div className="flex gap-2">
                    {/* 跳转按钮：仅当apiId存在且用户是世界创作者时显示 */}
                    {chapter.apiId && enterFrom !== 'card' && (
                      <button
                        type="button"
                        onClick={() => chapter.apiId != null && goToChapter(chapter.apiId)}
                        className="text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        进入章节
                      </button>
                    )}

                    {/* 【关键修改】删除按钮：添加 enterFrom === 'card' 禁用条件 */}
                    <button
                      type="button"
                      onClick={() => removeChapter(chapter.id)}
                      disabled={chapters.length <= 1 || chapterDeletingIds[chapter.id] || enterFrom === 'card' || !currentWorldId}
                      className={`text-sm text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${chapterDeletingIds[chapter.id] ? 'animate-pulse' : ''}`}
                      aria-label={`删除章节 ${index + 1}`}
                    >
                      {chapterDeletingIds[chapter.id] ? (
                        // 加载中：显示旋转图标
                        <svg className="w-4.5 h-4.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                      ) : (
                        // 正常状态：显示删除图标
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* 章节内容输入（保持不变） */}
          <div className="space-y-3">
            <input
              type="text"
              value={chapter.name}
              onChange={(e) => handleChapterChange(chapter.id, 'name', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all duration-200 outline-none"
              placeholder="章节名称 *（如：第一章：初入魔法森林）"
            />

            <textarea
              value={chapter.opening}
              onChange={(e) => handleChapterChange(chapter.id, 'opening', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all duration-200 outline-none min-h-[90px] resize-none"
              placeholder="章节开篇"
            />

            <textarea
              value={chapter.background}
              onChange={(e) => handleChapterChange(chapter.id, 'background', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all duration-200 outline-none min-h-[90px] resize-none"
              placeholder="你扮演的角色设定"
            />
          </div>
              </div>
            ))}

            {/* 移除章节操作按钮，章节将与世界一起创建 */}
            
            {/* 章节列表下方的添加章节按钮 */}
            <button
              type="button"
              onClick={addChapter}
              className="mb-4 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all duration-200 flex items-center gap-1.5 shadow-sm w-full justify-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              添加章节
            </button>
            
            {/* 创建世界和章节按钮 */}
            <button
              onClick={handleCreateWorld}
              disabled={worldLoading}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm flex items-center justify-center gap-2 mt-6"
            >
              {worldLoading ? (
                <>
                  <svg className="w-4.5 h-4.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  创建中...
                </>
              ) : (
                <>
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
                  创建世界和章节
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}