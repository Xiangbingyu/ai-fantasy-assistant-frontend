'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { World, UserWorld, WorldCharacter} from '../../types/db';
import Navbar from '../components/Navbar';
import FilterBar from '../components/FilterBar';
import MyWorldsSidebar from '../components/MyWorldsSidebar';
import WorldCard from '../components/WorldCard';
import { useRouter } from 'next/navigation';

const tags = ['魔法', '末世', '科幻', '古风', '校园', '武侠', '异能', '历史', '太空'];
const DEFAULT_WORLD_COVER = '/images/default-world-cover.png';

export default function WorldHall() {
  const Router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('热度');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allWorlds, setAllWorlds] = useState<World[]>([]);

  const [myWorlds, setMyWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredWorldId, setHoveredWorldId] = useState<number | null>(null);

  const params = useParams<{ userId: string }>();
  const currentUserId = Number(params.userId || '0');

  // 1. 获取所有公开世界
  useEffect(() => {
    const fetchAllWorlds = async () => {
      try {
        const res = await fetch('/api/db/worlds');
        if (!res.ok) throw new Error('获取世界列表失败');
        
        const data = await res.json();
        const worldsWithCovers = data.map((world: World) => ({
          ...world,
          cover_url: DEFAULT_WORLD_COVER
        }));
        setAllWorlds(worldsWithCovers);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : '获取世界数据异常';
        setError(errMsg);
        console.error(errMsg, err);
      }
    };

    fetchAllWorlds();
  }, []);


  // 2. 获取当前用户的世界
  useEffect(() => {
    if (isNaN(currentUserId) || currentUserId === 0) {
      setError('无效的用户ID');
      setLoading(false);
      return;
    }

    const fetchUserWorlds = async () => {
      try {
        const res = await fetch(`/api/db/user-worlds?user_id=${currentUserId}&role=creator`);
        if (!res.ok) throw new Error('获取个人世界失败');
        
        const userWorlds: UserWorld[] = await res.json();
        const userOwnedWorlds = allWorlds.filter(world => 
          userWorlds.some(uw => uw.world_id === world.id)
        ).sort((a, b) => 
          new Date(b.create_time).getTime() - new Date(a.create_time).getTime()
        );
        
        setMyWorlds(userOwnedWorlds);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : '获取个人世界异常';
        setError(errMsg);
        console.error(errMsg, err);
      } finally {
        setLoading(false);
      }
    };

    if (allWorlds.length > 0) {
      fetchUserWorlds();
    }
  }, [currentUserId, allWorlds]);
 
  // 筛选逻辑
  const filteredWorlds = allWorlds
    .filter(world => {
      if (!world.is_public) return false;
      if (selectedTags.length > 0 && !selectedTags.some(tag => world.tags.includes(tag))) return false;
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        return world.name.toLowerCase().includes(lowerQuery) 
          || world.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === '热度') return (b.popularity || 0) - (a.popularity || 0);
      if (sortBy === '更新时间') return new Date(b.create_time).getTime() - new Date(a.create_time).getTime();
      return 0;
    });

  // 进入创作逻辑（修复角色数据传递）
  // 修改后的 startCreation 函数中 URL 拼接逻辑
  const startCreation = async (worldId: number, from: 'sidebar' | 'card') => {  
    setError(null);
    setLoading(true);
    
    try {
      // 1. 仅验证世界是否存在（可选，确保跳转的世界有效）
      const res = await fetch(`/api/db/worlds/${worldId}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '获取世界详情失败');
      }

      // 2. 只拼接 3 个必要参数，彻底避免 URL 超限
      const queryParams = new URLSearchParams();
      queryParams.append('worldId', worldId.toString()); // 核心：仅传世界 ID
      queryParams.append('from', from); // 传来源（sidebar/card），用于权限控制
      queryParams.append('userId', currentUserId.toString()); // 传当前用户 ID（下一页可能需要）

      // 3. 跳转 URL（简洁，无超限风险）
      const jumpUrl = `/hall/${currentUserId}/world-chapters?${queryParams.toString()}`;
      Router.push(jumpUrl);

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '进入世界创作异常';
      setError(errMsg);
      console.error(errMsg, err);
    } finally {
      setLoading(false);
    }
  };

  const createWorld = () => {
    setError(null);
    setLoading(true);

    try{
      Router.push(`/hall/${currentUserId}/world-chapters`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '创建世界异常';
      setError(errMsg);
      console.error(errMsg, err);
    } finally {
      setLoading(false);
    }
  };

  const deleteWorld = async (worldId: number) => {
    setError(null);
    setLoading(true);
     
    try{                               // , methods=['DELETE'])'
      const res = await fetch(`/api/db/worlds/${worldId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '删除世界失败');
      }
      // 前端同步更新列表
      setAllWorlds(prev => prev.filter(world => world.id !== worldId));
      setMyWorlds(prev => prev.filter(world => world.id !== worldId));
    }catch (err) {
      const errMsg = err instanceof Error ? err.message : '删除世界异常';
      setError(errMsg);
      console.error(errMsg, err);
    }finally {
      setLoading(false);
    }

  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <div className="w-12 h-12 mb-4 text-indigo-600">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 20V10M18 10L12 4M18 10L22 6M8 14H4M8 18H4M8 10H4" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round">
              <animate attributeName="stroke-dasharray" from="0 20" to="20 0" dur="1s" repeatCount="indefinite"/>
            </path>
          </svg>
        </div>
        <p className="text-gray-600 text-lg">正在加载你的创作世界...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <div className="w-16 h-16 mb-4 text-red-500">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
            <path d="M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-red-500 text-lg mb-6">加载失败：{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
        >
          重试加载
        </button>
      </div>
    );
  }

  const navigateToNovels = () => {
    Router.push(`/hall/${currentUserId}/novels`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white"> 
      <Navbar
        title="幻境协创"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        />
      
      {/* 移除这个容器 */}

      <div className="bg-white py-3 transition-all duration-300 w-full">
        {/* 使用说明区域 */}
        <div className="container mx-auto px-4 mb-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">使用说明</h3>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                点击「公开世界」中的卡片引用模板进行创作，或点击下方「立即创作」开始全新世界。左侧「我的世界」可管理您已创建的世界。
              </p>
            </div>
          </div>
        </div>
        
        <FilterBar
        sortBy={sortBy}
        setSortBy={setSortBy}
        tags={tags}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
    />
    </div>

      <div className="flex flex-1 container mx-auto px-4 py-6 gap-6">
        <div className="w-[350px] bg-white rounded-xl shadow-sm p-6 flex-shrink-0">
          <MyWorldsSidebar
            myWorlds={myWorlds}
            onSelectWorld={(worldId) => startCreation(worldId, 'sidebar')}
            onDeleteWorld={deleteWorld}
          />
        </div>

        <main className="flex-1">
          <div className="flex items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            公开世界 {filteredWorlds.length > 0 ? `（共 ${filteredWorlds.length} 个）` : ''}
          </h2>
          <button
            onClick={navigateToNovels}
            className="ml-[800px] px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
            小说集
          </button>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorlds.length > 0 ? (
              filteredWorlds.map(world => (
                <div
                  key={world.id}
                  onMouseEnter={() => setHoveredWorldId(world.id)}
                  onMouseLeave={() => setHoveredWorldId(null)}
                  style={{
                    transform: hoveredWorldId === world.id ? 'translateY(-5px)' : 'translateY(0)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    boxShadow: hoveredWorldId === world.id ? '0 10px 20px rgba(255, 255, 255, 0.15)' : '0 4px 12px rgba(0, 0, 0, 0.05)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: 'white'
                  }}
                >
                  <WorldCard
                    world={world}
                    onClick={() => startCreation(world.id, 'card')}
                  />
                </div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-xl shadow-sm">
                <div className="w-20 h-20 mb-4 text-gray-300">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-gray-500 text-lg">没有找到符合条件的公开世界</p>
              </div>
            )}
          </div>
        </main>
      </div>

        {/* 立即创作按钮 - 固定在屏幕中下方 */}
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50">
            <button
            onClick={createWorld}
            className="px-10 py-4 rounded-lg border border-gray-800 bg-gray-800 text-white 
                        hover:bg-gray-700 hover:border-gray-700 transition-all duration-300 
                        text-lg font-medium shadow-md hover:shadow-lg transform hover:scale-105"
            >
            立即创作
            </button>
        </div>
    </div>
  );
}