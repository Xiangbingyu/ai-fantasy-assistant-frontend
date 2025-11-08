'use client';

import { useAuth } from '../../hooks/useAuth';

interface NavbarProps {
    title: string;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

export default function Navbar({ title, searchQuery, setSearchQuery }: NavbarProps) {
    const { user, logout, isLoading } = useAuth();
    
    const handleLogout = () => {
        if (typeof window !== 'undefined' && confirm('确定要退出登录吗？')) {
            try {
                logout();
            } catch (error) {
                console.error('退出登录失败:', error);
                if (typeof window !== 'undefined') {
                    alert('退出登录失败，请稍后重试');
                }
            }
        }
    };
    
    // 如果认证还在加载中，可以显示加载状态
    if (isLoading) {
        return (
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">AI 助手</h1>
                </div>
            </header>
        );
    }
    
    return (
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                    
                    <div className="flex items-center space-x-4">
                        {user && user.username && (
                            <>
                                <span className="text-gray-700">欢迎，{user.username}</span>
                                <button
                                    onClick={handleLogout}
                                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                >
                                    退出登录
                                </button>
                            </>
                        )}
                    </div>
                </div>
                
                <div className="relative w-full max-w-md mx-auto">
                    <input
                        type="text"
                        placeholder="搜索世界名称、标签或创建者..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        🔍
                    </span>
                </div>
            </div>
        </header>
    );
}