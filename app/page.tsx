'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, isLoading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  // 新增：背景元素动画状态
  const [bgPosition, setBgPosition] = useState({ x: 0, y: 0 });
  
  // 使用useEffect添加动画样式，确保只在客户端执行
  useEffect(() => {
    // 创建并添加动画样式
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes buttonGradient {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
    
    // 清理函数
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // 新增：实现鼠标移动视差效果
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 只有在客户端环境下执行
      if (typeof window !== 'undefined') {
        const x = (window.innerWidth / 2 - e.clientX) / 50;
        const y = (window.innerHeight / 2 - e.clientY) / 50;
        setBgPosition({ x, y });
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', handleMouseMove);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, []);
  
  // 新增：防止已登录用户访问登录页
  useEffect(() => {
    // 确保authLoading完成且用户已登录时才跳转
    if (!authLoading && user && user.id) {
      router.push(`/hall/${user.id}`);
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 表单验证
    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }
    
    if (!password || password.length < 6) {
      setError('密码长度不能少于6位');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const success = await login(username, password);
      if (!success) {
        setError('登录失败，请检查账号密码');
      }
      // 登录成功后，useEffect会自动处理路由跳转
    } catch (err) {
      console.error('登录错误:', err);
      setError('网络连接异常，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    // 1. 主题背景：替换为手写稿+墨水纹理，鼠标移动时有视差效果
    <div 
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        // 小说创作主题背景（手写稿+墨水纹理）
        backgroundImage: `
        linear-gradient(rgba(245, 247, 250, 0.92), rgba(245, 247, 250, 0.97)),
        url('/image/login1.png')
        `,
        backgroundBlendMode: 'multiply, overlay',
        backgroundSize: 'cover, cover',
        backgroundPosition: `${bgPosition.x}px ${bgPosition.y}px`, // 随鼠标移动偏移
        backgroundAttachment: 'fixed',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        transition: 'background-position 0.1s ease-out', // 平滑过渡
      }}
    >
      {/* 2. 登录卡片：强化悬浮动画和互动反馈 */}
      <div 
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: 'rgba(255, 255, 255, 0.8)', 
          borderRadius: '16px',
          boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.1)',
          padding: '48px 32px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-5px) scale(1.01)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 15px 35px -5px rgba(105, 90, 205, 0.2)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0) scale(1)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 30px -5px rgba(0, 0, 0, 0.1)';
        }}
      >
        {/* 顶部装饰条：动态渐变效果 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '4px',
          background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #6366f1)',
          backgroundSize: '200% 100%',
          animation: 'gradientShift 3s ease infinite', // 渐变流动动画
        }}></div>

        {/* 3. 标题区：加入动态效果 */}
        <div style={{ marginBottom: '36px', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 700,
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            margin: '0 0 8px 0',
            letterSpacing: '-0.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            position: 'relative',
          }}>
            {/* 钢笔图标：悬停时轻微旋转 */}
            <svg 
              width="32" 
              height="32" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              style={{ transition: 'transform 0.3s ease' }}
              onMouseEnter={(e) => {
                (e.currentTarget as SVGElement).style.transform = 'rotate(5deg)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as SVGElement).style.transform = 'rotate(0)';
              }}
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
            fontSize: '14px',
            color: '#64748b',
            margin: '0',
            letterSpacing: '0.2px',
          }}>
            和AI一起，把灵感写成小说
          </p>
        </div>

        {/* 表单标题 */}
        <h2 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#1e293b',
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          登录 / 注册
        </h2>

        {/* 4. 表单区域：增强交互细节 */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
          {/* 用户名输入框：增加动态缩放效果 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '8px',
              transition: 'color 0.2s ease',
              // 输入框聚焦时标签变色
              color: focusedInput === 'username' ? '#6366f1' : '#475569',
            }}>
              创作笔名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="你的笔名（将显示在作品中）"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '15px',
                borderRadius: '8px',
                border: `1px solid ${focusedInput === 'username' ? '#6366f1' : '#e2e8f0'}`,
                backgroundColor: '#f8fafc',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease',
                outline: 'none',
                boxShadow: focusedInput === 'username' ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none',
              }}
              required
              onFocus={() => setFocusedInput('username')}
              onBlur={() => setFocusedInput(null)}
              // 新增：输入时轻微缩放，增强反馈
              onInput={(e) => {
                // 使用React的方式处理样式变化，避免直接操作DOM
                if (typeof window !== 'undefined') {
                  const inputElement = e.currentTarget as HTMLInputElement;
                  inputElement.style.transform = 'scale(1.01)';
                  setTimeout(() => {
                    // 在setTimeout回调中再次确认window存在并使用保存的元素引用
                    if (typeof window !== 'undefined' && inputElement) {
                      inputElement.style.transform = 'scale(1)';
                    }
                  }, 100);
                }
              }}
            />
          </div>

          {/* 密码输入框：增强交互反馈 */}
          <div style={{ marginBottom: '28px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: focusedInput === 'password' ? '#6366f1' : '#475569',
              marginBottom: '8px',
              transition: 'color 0.2s ease',
            }}>
              密码
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="设置登录密码（6-20位）"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  paddingRight: '48px',
                  fontSize: '15px',
                  borderRadius: '8px',
                  border: `1px solid ${focusedInput === 'password' ? '#6366f1' : '#e2e8f0'}`,
                  backgroundColor: '#f8fafc',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease',
                  outline: 'none',
                  boxShadow: focusedInput === 'password' ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none',
                }}
                required
                minLength={6}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                onInput={(e) => {
                // 使用React的方式处理样式变化，避免直接操作DOM
                if (typeof window !== 'undefined') {
                  const inputElement = e.currentTarget as HTMLInputElement;
                  inputElement.style.transform = 'scale(1.01)';
                  setTimeout(() => {
                    // 在setTimeout回调中再次确认window存在并使用保存的元素引用
                    if (typeof window !== 'undefined' && inputElement) {
                      inputElement.style.transform = 'scale(1)';
                    }
                  }, 100);
                }
              }}
              />
              {/* 密码可见切换：图标悬停动画 */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  transition: 'color 0.2s ease, transform 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = '#6366f1';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-50%) scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-50%) scale(1)';
                }}
              >
                {showPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
          </div>

          {/* 5. 登录按钮：强化互动效果 */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              fontWeight: 500,
              color: 'white',
              borderRadius: '8px',
              background: loading ? '#a5b4fc' : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              backgroundSize: loading ? '100% 100%' : '200% 100%',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: loading ? 0.8 : 1,
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: loading ? 'none' : 'buttonGradient 3s ease infinite', // 按钮渐变流动
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 18px rgba(99, 102, 241, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(99, 102, 241, 0.3)';
              }
            }}
          >
            {loading ? (
              <div style={{
                width: '18px',
                height: '18px',
                border: '2px solid white',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}></div>
            ) : (
              '登录 / 注册'
            )}
          </button>
        </form>

        {/* 错误提示：增加淡入动画 */}
        {error && (
          <p style={{
            color: '#dc2626',
            fontSize: '13px',
            textAlign: 'center',
            marginTop: '0',
            marginBottom: '8px',
            padding: '8px 12px',
            backgroundColor: 'rgba(220, 38, 38, 0.05)',
            borderRadius: '6px',
            animation: 'fadeIn 0.3s ease', // 错误提示淡入
          }}>
            {error}
          </p>
        )}

        {/* 底部说明：个人项目信息 */}
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontSize: '12px',
            color: '#94a3b8',
            margin: '0',
            lineHeight: '1.5',
          }}>
            个人项目 | 独立开发 | AI小说创作助手
          </p>
          <p style={{
            fontSize: '12px',
            color: '#94a3b8',
            margin: '4px 0 0 0',
          }}>
            前端：Next.js + React + TypeScript | 后端：Flask
          </p>
        </div>
      </div>
    </div>
  );
}

// 动画样式已移至useEffect钩子中，确保只在客户端执行