// app/hall/[userId]/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation'; // 关键：引入路由参数钩子
import { World, UserWorld } from '../../types/db';
import Navbar from '../components/Navbar';
import FilterBar from '../components/FilterBar';
import MyWorldsSidebar from '../components/MyWorldsSidebar';
import WorldCard from '../components/WorldCard';

const tags = ['魔法', '末世', '科幻', '古风', '校园', '武侠', '异能', '历史', '太空'];

export default function WorldHall() {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('热度');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [allWorlds, setAllWorlds] = useState<World[]>([]);
    const [myWorlds, setMyWorlds] = useState<World[]>([]);
    const [loading, setLoading] = useState(true); // 统一管理加载状态
    const [error, setError] = useState<string | null>(null);

    const params = useParams<{ userId: string }>();
    const currentUserId = Number(params.userId || '0');

    // 1. 获取所有公开世界
    useEffect(() => {
        const fetchAllWorlds = async () => {
            try {
                const res = await fetch('/api/db/worlds');
                if (!res.ok) throw new Error('获取世界列表失败');
                
                const data = await res.json();
                setAllWorlds(data);
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
                // 调用 user-worlds 接口，筛选当前用户的世界
                const res = await fetch(`/api/db/user-worlds?user_id=${currentUserId}&role=creator`);
                if (!res.ok) throw new Error('获取个人世界失败');
                
                const userWorlds: UserWorld[] = await res.json();
                // 从所有世界中匹配用户关联的世界
                const userOwnedWorlds = allWorlds.filter(world => 
                    userWorlds.some(uw => uw.world_id === world.id)
                );
                // 按创建时间排序
                userOwnedWorlds.sort((a, b) => 
                    new Date(b.create_time).getTime() - new Date(a.create_time).getTime()
                );
                
                setMyWorlds(userOwnedWorlds);
            } catch (err) {
                const errMsg = err instanceof Error ? err.message : '获取个人世界异常';
                setError(errMsg);
                console.error(errMsg, err);
            } finally {
                // 关键：无论成功/失败，都停止加载
                setLoading(false);
            }
        };

        // 确保所有世界数据加载完成后，再获取个人世界
        if (allWorlds.length > 0) {
            fetchUserWorlds();
        }
    }, [currentUserId, allWorlds]);

    // 筛选逻辑
    const filteredWorlds = allWorlds
        .filter(world => {
            if (!world.is_public) return false;
            // 标签筛选
            if (selectedTags.length > 0 && !selectedTags.some(tag => world.tags.includes(tag))) return false;
            // 搜索筛选
            if (searchQuery) {
                const lowerQuery = searchQuery.toLowerCase();
                return world.name.toLowerCase().includes(lowerQuery) 
                    || world.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
            }
            return true;
        })
        .sort((a, b) => {
            if (sortBy === '热度') return b.popularity - a.popularity;
            if (sortBy === '更新时间') return new Date(b.create_time).getTime() - new Date(a.create_time).getTime();
            return 0;
        });

    // 进入创作逻辑
    const startCreation = (worldId: number) => {
        const targetWorld = allWorlds.find(w => w.id === worldId);
        if (targetWorld) {
            console.log(`进入世界创作: ${targetWorld.name}`);
            // 实际项目中可替换为导航：router.push(`/create/${worldId}`)
            alert(`开始创作世界: ${targetWorld.name}`);
        }
    };

    // 加载中状态
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-600">
                正在加载世界数据...
            </div>
        );
    }

    // 错误状态
    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-red-500 p-4">
                <p>加载失败：{error}</p>
                <button 
                    onClick={() => window.location.reload()} 
                    className="mt-4 px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                >
                    重试
                </button>
            </div>
        );
    }

    // 正常渲染
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar
                title="幻境协创"
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
            />
            <FilterBar
                sortBy={sortBy}
                setSortBy={setSortBy}
                tags={tags}
                selectedTags={selectedTags}
                setSelectedTags={setSelectedTags}
            />

            <div className="flex flex-1 container mx-auto px-4 py-6 gap-6">
                <MyWorldsSidebar
                    myWorlds={myWorlds}
                    onSelectWorld={startCreation}
                />

                <main className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredWorlds.length > 0 ? (
                            filteredWorlds.map(world => (
                                <WorldCard
                                    key={world.id}
                                    world={world}
                                    onClick={() => startCreation(world.id)}
                                />
                            ))
                        ) : (
                            <div className="col-span-full text-center py-12 text-gray-500">
                                没有找到符合条件的公开世界
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}