'use client';

import { useAuth } from '../../hooks/useAuth';

interface NavbarProps {
    title: string;
}

export default function Navbar({ title }: NavbarProps) {
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
            <div className="container mx-auto px-4 py-4">
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
                
            </div>
        </header>
    );
}