'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

interface UseRouteProtectionProps {
  requireOwnership?: boolean;
}

interface UseRouteProtectionReturn {
  isChecking: boolean;
  isProtected: boolean;
  user: { id: number; username: string } | null;
}

export function useRouteProtection({
  requireOwnership = false,
}: UseRouteProtectionProps = {}): UseRouteProtectionReturn {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [isProtected, setIsProtected] = useState(false);

  useEffect(() => {
    const checkRouteProtection = () => {
      // 确保只在客户端执行
      if (typeof window === 'undefined') {
        setIsChecking(false);
        return;
      }

      setIsChecking(true);
      
      // 如果认证还在加载中，不进行检查
      if (isAuthLoading) {
        setIsChecking(false);
        return;
      }

      // 如果用户未登录，重定向到登录页
      if (!user) {
        router.push('/');
        setIsChecking(false);
        return;
      }

      // 如果需要所有权验证（用户只能访问自己的数据）
      if (requireOwnership && params && typeof params.userId === 'string') {
        try {
          const requestedUserId = Number(params.userId);
          // 如果URL中的用户ID与当前登录用户ID不匹配，重定向到用户自己的页面
          if (!isNaN(requestedUserId) && requestedUserId !== user.id) {
            router.push(`/hall/${user.id}`);
            setIsChecking(false);
            return;
          }
        } catch (error) {
          console.error('用户ID验证失败:', error);
          router.push(`/hall/${user.id}`);
          setIsChecking(false);
          return;
        }
      }

      // 验证通过
      setIsProtected(false);
      setIsChecking(false);
    };

    checkRouteProtection();
  }, [user, isAuthLoading, requireOwnership, params, router]);

  return { isChecking, isProtected, user };
}