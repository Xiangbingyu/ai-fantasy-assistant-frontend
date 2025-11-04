// components/MyWorldsSidebar.tsx
import { World } from '@/app/types/db';

interface MyWorldsSidebarProps {
    myWorlds: World[];
    onSelectWorld: (worldId: number) => void;
    onDeleteWorld: (worldId: number) => void;
}

export default function MyWorldsSidebar({ myWorlds, onSelectWorld, onDeleteWorld }: MyWorldsSidebarProps) {
    const handleDeleteClick = (e: React.MouseEvent, worldId: number) => {
        e.stopPropagation();
        if (window.confirm('确定删除这个世界吗？删除后无法恢复！')) {
            onDeleteWorld(worldId);
        }
    };

    return (
        <aside className="w-full max-w-2xl shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold">我的世界</h2>
                </div>

                <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
                    {myWorlds.length > 0 ? (
                        <ul>
                            {myWorlds.map(world => (
                                <li key={world.id} className="relative group">
                                    <button
                                        onClick={() => onSelectWorld(world.id)}
                                        className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex flex-col transition-colors duration-200"
                                    >
                                        <div className="flex items-center whitespace-nowrap"> {/* 新增 whitespace-nowrap 禁止换行 */}
                                            <span className="truncate flex-1"> {/* 名称过长时截断，flex-1 占满剩余空间 */}
                                                {world.name}
                                            </span>
                                            <span className="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-1.5 py-0.5 rounded">
                                                {world.is_public ? '公开' : '私有'}
                                            </span>
                                        </div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                            创建时间: {new Date(world.create_time).toLocaleString()}
                                        </span>
                                    </button>

                                    {/* 优化后的删除按钮 */}
                                    <button
                                        onClick={(e) => handleDeleteClick(e, world.id)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-red-50 text-red-500 
                                                    hover:bg-red-500 hover:text-white border border-red-200 hover:border-red-500
                                                    flex items-center justify-center opacity-0 group-hover:opacity-100
                                                    transition-all duration-200 shadow-sm hover:shadow"
                                        aria-label={`删除世界 ${world.name}`}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                            <path d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                            暂无世界
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}