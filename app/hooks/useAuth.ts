'use client';
import { useState, useEffect, createContext, useContext, ReactNode, createElement } from 'react';
import { useRouter } from 'next/navigation';

// 定义用户类型
interface User {
  id: number;
  username: string;
}

// 定义认证上下文类型
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// 创建上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 导出Provider组件
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 检查本地存储中的用户信息
  useEffect(() => {
    // 立即设置isLoading为true
    setIsLoading(true);
    
    // 确保只在客户端执行
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.id && parsedUser.username) {
            setUser(parsedUser);
          }
        }
      } catch (error) {
        console.error('初始化认证状态失败:', error);
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  // 登录方法
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/db/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.user_id) {
        const userInfo: User = {
          id: data.user_id,
          username: username
        };
        setUser(userInfo);
        
        // 确保只在客户端执行localStorage操作
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(userInfo));
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('登录失败:', error);
      return false;
    }
  };

  // 登出方法
  const logout = (): void => {
    setUser(null);
    
    // 确保只在客户端执行localStorage操作
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
    
    // 延迟路由跳转，确保状态更新完成
    setTimeout(() => {
      router.push('/');
    }, 0);
  };

  // 提供上下文值
  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout
  };

  // 使用React.createElement方法替代JSX语法
  return createElement(AuthContext.Provider, { value }, children);
}

// 导出自定义hook
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth必须在AuthProvider内部使用');
  }
  
  return context;
}