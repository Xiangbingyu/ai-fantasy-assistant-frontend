// app/hall/[userId]/world-chapters/page.tsx
'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CreateWorldPayload, CreateChapterPayload } from '../../../types/db';

// 角色类型定义
interface Character {
  id: string;
  name: string;
  background: string;
}

// 章节表单类型定义
interface ChapterForm {
  id: string;
  name: string;
  opening: string;
  background: string;
}

export default function WorldChaptersPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const currentUserId = Number(params.userId || '0');
  
  // 状态管理
  const [worldLoading, setWorldLoading] = useState(false);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentWorldId, setCurrentWorldId] = useState<number | null>(null);
  
  // 世界表单状态
  type WorldFormState = Omit<CreateWorldPayload, 'tags' | 'characters'> & {
    tags: string[];
    characters: { name: string; background: string }[];
  };

  const [worldForm, setWorldForm] = useState<WorldFormState>({
    user_id: currentUserId,
    name: '',
    tags: [],
    is_public: false,
    worldview: '',
    master_setting: '',
    origin_world_id: null,
    popularity: 0,
    characters: []
  });
  
  // 标签输入状态（用于处理逗号分隔输入）
  const [tagInput, setTagInput] = useState('');
  
  // 角色状态管理
  const [characters, setCharacters] = useState<Character[]>([
    { id: '1', name: '', background: '' }
  ]);
  
  // 章节表单状态
  const [chapters, setChapters] = useState<ChapterForm[]>([
    { id: '1', name: '', opening: '', background: '' }
  ]);

  // 处理世界表单字段变化
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
  
  // 处理标签输入
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
  
  // 删除标签
  const removeTag = (tagToRemove: string) => {
    setWorldForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };
  
  // 处理角色变化
  const handleCharacterChange = (id: string, field: 'name' | 'background', value: string) => {
    setCharacters(prev => 
      prev.map(char => 
        char.id === id ? { ...char, [field]: value } : char
      )
    );
  };
  
  // 添加新角色
  const addCharacter = () => {
    const newId = Date.now().toString();
    setCharacters(prev => [...prev, { id: newId, name: '', background: '' }]);
  };
  
  // 删除角色
  const removeCharacter = (id: string) => {
    if (characters.length > 1) {
      setCharacters(prev => prev.filter(char => char.id !== id));
    }
  };
  
  // 处理章节变化
  const handleChapterChange = (id: string, field: 'name' | 'opening' | 'background', value: string) => {
    setChapters(prev => 
      prev.map(chapter => 
        chapter.id === id ? { ...chapter, [field]: value } : chapter
      )
    );
  };
  
  // 添加新章节
  const addChapter = () => {
    const newId = Date.now().toString();
    setChapters(prev => [...prev, { id: newId, name: '', opening: '', background: '' }]);
  };
  
  // 删除章节
  const removeChapter = (id: string) => {
    if (chapters.length > 1) {
      setChapters(prev => prev.filter(chapter => chapter.id !== id));
    }
  };
  
  // 提交世界表单
  const handleCreateWorld = async () => {
    setError(null);
    setSuccess(null);
    setWorldLoading(true);
    
    // 验证表单
    if (!worldForm.name.trim()) {
      setError('世界名称不能为空');
      setWorldLoading(false);
      return;
    }
    
    // 准备提交的数据
    const payload: CreateWorldPayload = {
      ...worldForm,
      user_id: currentUserId,
      characters: characters.map(char => ({
        name: char.name,
        background: char.background
      }))
    };
    
    try {
      const response = await fetch('/api/db/worlds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '创建世界失败');
      }
      
      setSuccess('世界创建成功！');
      setCurrentWorldId(data.id);
      // 清空世界表单
      setWorldForm({
        user_id: currentUserId,
        name: '',
        tags: [],
        is_public: false,
        worldview: '',
        master_setting: '',
        origin_world_id: null,
        popularity: 0,
        characters: []
      });
      setCharacters([{ id: '1', name: '', background: '' }]);
      setTagInput('');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建世界时发生错误');
    } finally {
      setWorldLoading(false);
    }
  };
  
  // 提交章节表单
  const handleCreateChapters = async () => {
    if (!currentWorldId) {
      setError('请先创建世界');
      return;
    }
    
    setError(null);
    setSuccess(null);
    setChapterLoading(true);
    
    // 验证章节表单
    const invalidChapter = chapters.find(ch => !ch.name.trim());
    if (invalidChapter) {
      setError('章节名称不能为空');
      setChapterLoading(false);
      return;
    }
    
    try {
      // 逐个创建章节
      for (const chapter of chapters) {
        const payload: CreateChapterPayload = {
          world_id: currentWorldId,
          creator_user_id: currentUserId,
          name: chapter.name,
          opening: chapter.opening,
          background: chapter.background,
          is_default: chapters.indexOf(chapter) === 0, // 第一个章节设为默认
          origin_chapter_id: null
        };
        
        const response = await fetch('/api/db/chapters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `创建章节 "${chapter.name}" 失败`);
        }
      }
      
      setSuccess('所有章节创建成功！');
      // 重置章节表单
      setChapters([{ id: '1', name: '', opening: '', background: '' }]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建章节时发生错误');
    } finally {
      setChapterLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">世界与章节管理</h1>
        
        {error && (
          <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 p-4 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100 p-4 rounded mb-4">
            {success}
          </div>
        )}
        
        {/* 创建世界板块 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 mb-8">
          <h2 className="text-xl font-semibold mb-4">创建新世界</h2>
          
          <div className="space-y-4">
            {/* 世界名称 */}
            <div>
              <label className="block text-sm font-medium mb-1">世界名称 *</label>
              <input
                type="text"
                name="name"
                value={worldForm.name}
                onChange={handleWorldInputChange}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                placeholder="输入世界名称"
              />
            </div>
            
            {/* 标签 */}
            <div>
              <label className="block text-sm font-medium mb-1">标签</label>
              <form onSubmit={handleTagInput} className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                  placeholder="输入标签后按回车添加"
                />
                <button 
                  type="submit"
                  className="px-3 py-1 bg-blue-500 text-white rounded"
                >
                  添加
                </button>
              </form>
              
              <div className="flex flex-wrap gap-2 mt-2">
                {worldForm.tags.map(tag => (
                  <span 
                    key={tag} 
                    className="inline-flex items-center bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm"
                  >
                    {tag}
                    <button 
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            
            {/* 是否公开 */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_public"
                  checked={worldForm.is_public}
                  onChange={handleWorldInputChange}
                  className="mr-2"
                />
                <span className="text-sm">设为公开世界</span>
              </label>
            </div>
            
            {/* 世界观描述 */}
            <div>
              <label className="block text-sm font-medium mb-1">世界观描述</label>
              <textarea
                name="worldview"
                value={worldForm.worldview}
                onChange={handleWorldInputChange}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 min-h-[100px]"
                placeholder="描述这个世界的基本设定和背景"
              />
            </div>
            
            {/* 核心设定 */}
            <div>
              <label className="block text-sm font-medium mb-1">核心设定</label>
              <textarea
                name="master_setting"
                value={worldForm.master_setting}
                onChange={handleWorldInputChange}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 min-h-[100px]"
                placeholder="描述这个世界的核心规则和设定"
              />
            </div>
            
            {/* 角色设定 */}
            <div>
              <label className="block text-sm font-medium mb-2">主要角色</label>
              
              {characters.map((char, index) => (
                <div key={char.id} className="border border-gray-200 dark:border-gray-700 rounded p-3 mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">角色 {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeCharacter(char.id)}
                      disabled={characters.length <= 1}
                      className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      删除
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={char.name}
                      onChange={(e) => handleCharacterChange(char.id, 'name', e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                      placeholder="角色名称"
                    />
                    
                    <textarea
                      value={char.background}
                      onChange={(e) => handleCharacterChange(char.id, 'background', e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 min-h-[80px]"
                      placeholder="角色背景故事"
                    />
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addCharacter}
                className="mt-1 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm"
              >
                + 添加角色
              </button>
            </div>
            
            <button
              onClick={handleCreateWorld}
              disabled={worldLoading}
              className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
            >
              {worldLoading ? '创建中...' : '创建世界'}
            </button>
          </div>
        </div>
        
        {/* 章节管理板块 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5">
          <h2 className="text-xl font-semibold mb-4">章节管理</h2>
          
          {currentWorldId ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                当前编辑的世界 ID: {currentWorldId}
              </p>
              
              {chapters.map((chapter, index) => (
                <div key={chapter.id} className="border border-gray-200 dark:border-gray-700 rounded p-3 mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">章节 {index + 1} {index === 0 ? '(默认章节)' : ''}</h3>
                    <button
                      type="button"
                      onClick={() => removeChapter(chapter.id)}
                      disabled={chapters.length <= 1}
                      className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      删除
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={chapter.name}
                      onChange={(e) => handleChapterChange(chapter.id, 'name', e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                      placeholder="章节名称 *"
                    />
                    
                    <textarea
                      value={chapter.opening}
                      onChange={(e) => handleChapterChange(chapter.id, 'opening', e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 min-h-[80px]"
                      placeholder="章节开篇"
                    />
                    
                    <textarea
                      value={chapter.background}
                      onChange={(e) => handleChapterChange(chapter.id, 'background', e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 min-h-[80px]"
                      placeholder="章节背景"
                    />
                  </div>
                </div>
              ))}
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addChapter}
                  className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 rounded text-sm"
                >
                  + 添加新章节
                </button>
                
                <button
                  onClick={handleCreateChapters}
                  disabled={chapterLoading}
                  className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
                >
                  {chapterLoading ? '创建中...' : '创建章节'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              请先创建一个世界，然后才能添加章节
            </div>
          )}
        </div>
      </div>
    </div>
  );
}