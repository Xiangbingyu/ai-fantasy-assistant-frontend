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
  const [bgPosition, setBgPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  // 检测设备类型（移动端/桌面端）
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 768);
      }
    };
    
    checkMobile();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkMobile);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', checkMobile);
      }
    };
  }, []);

  // 添加动画样式
  useEffect(() => {
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
      /* 移动端触摸反馈样式 */
      .touch-active {
        transform: scale(0.98) !important;
        transition: transform 0.1s ease !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // 鼠标/触摸移动视差效果（适配移动端触摸事件）
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (typeof window !== 'undefined') {
        // 移动端减弱视差效果
        const factor = isMobile ? 150 : 100;
        const x = (window.innerWidth / 2 - clientX) / factor;
        const y = (window.innerHeight / 2 - clientY) / factor;
        setBgPosition({ x, y });
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      // 移动端触摸时也触发视差
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchmove', handleTouchMove);
      }
    };
  }, [isMobile]);
  
  // 已登录用户跳转
  useEffect(() => {
    if (!authLoading && user && user.id) {
      router.push(`/hall/${user.id}`);
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
    } catch (err) {
      console.error('登录错误:', err);
      setError('网络连接异常，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 修复：触摸反馈处理函数 - 保存currentTarget引用并增加空值检查
  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (isMobile) {
      const target = e.currentTarget;
      if (target) {
        target.classList.add('touch-active');
      }
    }
  };
  
  const handleTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    if (isMobile) {
      const target = e.currentTarget; // 立即保存引用
      setTimeout(() => {
        // 增加空值检查，确保安全访问
        if (target && target.classList) {
          target.classList.remove('touch-active');
        }
      }, 100);
    }
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // 移动端增加内边距
        padding: isMobile ? '15px' : '20px',
        backgroundColor: '#f8f5f0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative',
        overflow: 'hidden',
        // 移动端防止滚动溢出
        overflowX: 'hidden',
      }}
    >
        {/* 彩色装饰元素：移动端调整大小和位置 */}
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          pointerEvents: 'none', 
          zIndex: 0,
          // 移动端减少装饰元素可见性
          opacity: isMobile ? 0.6 : 1
        }}>
          {/* 装饰元素1：圆形气泡 - 响应式调整 */}
          <div style={{
            position: 'absolute',
            top: isMobile ? '5%' : '10%',
            left: isMobile ? '3%' : '5%',
            width: isMobile ? '80px' : '120px',
            height: isMobile ? '80px' : '120px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255, 65, 125, 0.35), rgba(255, 105, 180, 0.25))',
            transform: `translate(${bgPosition.x * -0.5}px, ${bgPosition.y * -0.5}px)`,
            transition: 'transform 0.15s ease-out',
            boxShadow: '0 4px 20px rgba(255, 105, 180, 0.3)'
          }}></div>
          
          {/* 装饰元素2：矩形方块 - 响应式调整 */}
          <div style={{
            position: 'absolute',
            top: isMobile ? '70%' : '60%',
            left: isMobile ? '75%' : '80%',
            width: isMobile ? '70px' : '100px',
            height: isMobile ? '70px' : '100px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(65, 105, 225, 0.35), rgba(100, 149, 237, 0.25))',
            transform: `translate(${bgPosition.x * 0.3}px, ${bgPosition.y * 0.3}px) rotate(15deg)`,
            transition: 'transform 0.15s ease-out',
            boxShadow: '0 4px 20px rgba(100, 149, 237, 0.3)'
          }}></div>
          
          {/* 装饰元素3：云朵形状 - 响应式调整 */}
          <div style={{
            position: 'absolute',
            top: isMobile ? '25%' : '30%',
            left: isMobile ? '65%' : '75%',
            width: isMobile ? '110px' : '150px',
            height: isMobile ? '60px' : '80px',
            borderRadius: '30px',
            background: 'linear-gradient(135deg, rgba(50, 205, 50, 0.35), rgba(152, 251, 152, 0.25))',
            transform: `translate(${bgPosition.x * -0.2}px, ${bgPosition.y * -0.2}px)`,
            transition: 'transform 0.15s ease-out',
            boxShadow: '0 4px 20px rgba(152, 251, 152, 0.3)',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              left: '15px',
              width: isMobile ? '40px' : '60px',
              height: isMobile ? '40px' : '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(50, 205, 50, 0.35), rgba(152, 251, 152, 0.25))'
            }}></div>
            <div style={{
              position: 'absolute',
              top: '-15px',
              left: '50px',
              width: isMobile ? '50px' : '70px',
              height: isMobile ? '50px' : '70px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(50, 205, 50, 0.35), rgba(152, 251, 152, 0.25))'
            }}></div>
          </div>
          
          {/* 装饰元素4：小气泡 - 响应式调整 */}
          <div style={{
            position: 'absolute',
            top: isMobile ? '85%' : '80%',
            left: isMobile ? '10%' : '15%',
            width: isMobile ? '40px' : '60px',
            height: isMobile ? '40px' : '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255, 99, 71, 0.35), rgba(255, 182, 193, 0.25))',
            transform: `translate(${bgPosition.x * 0.4}px, ${bgPosition.y * 0.4}px)`,
            transition: 'transform 0.15s ease-out',
            boxShadow: '0 4px 15px rgba(255, 182, 193, 0.3)'
          }}></div>
          
          {/* 装饰元素5：椭圆 - 响应式调整 */}
          <div style={{
            position: 'absolute',
            top: isMobile ? '50%' : '45%',
            left: isMobile ? '5%' : '10%',
            width: isMobile ? '100px' : '140px',
            height: isMobile ? '60px' : '80px',
            borderRadius: '30px',
            background: 'linear-gradient(135deg, rgba(147, 112, 219, 0.35), rgba(221, 160, 221, 0.25))',
            transform: `translate(${bgPosition.x * -0.3}px, ${bgPosition.y * -0.3}px) rotate(-20deg)`,
            transition: 'transform 0.15s ease-out',
            boxShadow: '0 4px 20px rgba(221, 160, 221, 0.3)'
          }}></div>
        </div>
        
        {/* 登录卡片：响应式调整 */}
      <div 
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: 'rgba(255, 255, 255, 0.97)',
          borderRadius: isMobile ? '12px' : '16px',
          boxShadow: isMobile ? '0 8px 25px -5px rgba(0, 0, 0, 0.1)' : '0 10px 30px -5px rgba(0, 0, 0, 0.1)',
          // 移动端调整内边距
          padding: isMobile ? '32px 20px' : '48px 32px',
          position: 'relative',
          overflow: 'hidden',
          transition: isMobile ? 'none' : 'transform 0.3s ease, box-shadow 0.3s ease',
          zIndex: 1,
          // 移动端增加触摸反馈区域
          touchAction: 'manipulation',
        }}
        onMouseEnter={(e) => {
          if (!isMobile) {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-5px) scale(1.01)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 15px 35px -5px rgba(105, 90, 205, 0.2)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isMobile) {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0) scale(1)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = isMobile ? '0 8px 25px -5px rgba(0, 0, 0, 0.1)' : '0 10px 30px -5px rgba(0, 0, 0, 0.1)';
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 顶部装饰条 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '4px',
          background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #6366f1)',
          backgroundSize: '200% 100%',
          animation: 'gradientShift 3s ease infinite',
        }}></div>

        {/* 标题区：响应式调整 */}
        <div style={{ marginBottom: isMobile ? '24px' : '36px', textAlign: 'center' }}>
          <h1 style={{
            fontSize: isMobile ? '28px' : '36px',
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
            gap: isMobile ? '8px' : '12px',
          }}>
            <svg 
              width={isMobile ? '24' : '32'} 
              height={isMobile ? '24' : '32'} 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              style={{ transition: 'transform 0.3s ease' }}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  (e.currentTarget as SVGElement).style.transform = 'rotate(5deg)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  (e.currentTarget as SVGElement).style.transform = 'rotate(0)';
                }
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
            fontSize: isMobile ? '13px' : '14px',
            color: '#64748b',
            margin: '0',
            letterSpacing: '0.2px',
          }}>
            和AI一起，把灵感写成小说
          </p>
        </div>

        {/* 表单标题 */}
        <h2 style={{
          fontSize: isMobile ? '16px' : '18px',
          fontWeight: 600,
          color: '#1e293b',
          marginBottom: isMobile ? '20px' : '24px',
          textAlign: 'center',
        }}>
          登录 / 注册
        </h2>

        {/* 表单区域 */}
        <form onSubmit={handleSubmit} style={{ marginBottom: isMobile ? '20px' : '24px' }}>
          {/* 用户名输入框：响应式调整 */}
          <div style={{ marginBottom: isMobile ? '16px' : '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '8px',
              transition: 'color 0.2s ease',
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
                // 移动端调整内边距
                padding: isMobile ? '11px 14px' : '12px 16px',
                fontSize: isMobile ? '14px' : '15px',
                borderRadius: '8px',
                border: `1px solid ${focusedInput === 'username' ? '#6366f1' : '#e2e8f0'}`,
                backgroundColor: '#f8fafc',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease',
                outline: 'none',
                boxShadow: focusedInput === 'username' ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none',
                // 移动端增大点击区域
                touchAction: 'manipulation',
              }}
              required
              onFocus={() => setFocusedInput('username')}
              onBlur={() => setFocusedInput(null)}
              onInput={(e) => {
                if (typeof window !== 'undefined' && !isMobile) {
                  const inputElement = e.currentTarget as HTMLInputElement;
                  inputElement.style.transform = 'scale(1.01)';
                  setTimeout(() => {
                    if (typeof window !== 'undefined' && inputElement) {
                      inputElement.style.transform = 'scale(1)';
                    }
                  }, 100);
                }
              }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            />
          </div>

          {/* 密码输入框：响应式调整 */}
          <div style={{ marginBottom: isMobile ? '24px' : '28px' }}>
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
                  padding: isMobile ? '11px 14px' : '12px 16px',
                  paddingRight: isMobile ? '42px' : '48px',
                  fontSize: isMobile ? '14px' : '15px',
                  borderRadius: '8px',
                  border: `1px solid ${focusedInput === 'password' ? '#6366f1' : '#e2e8f0'}`,
                  backgroundColor: '#f8fafc',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease',
                  outline: 'none',
                  boxShadow: focusedInput === 'password' ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none',
                  touchAction: 'manipulation',
                }}
                required
                minLength={6}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                onInput={(e) => {
                  if (typeof window !== 'undefined' && !isMobile) {
                    const inputElement = e.currentTarget as HTMLInputElement;
                    inputElement.style.transform = 'scale(1.01)';
                    setTimeout(() => {
                      if (typeof window !== 'undefined' && inputElement) {
                        inputElement.style.transform = 'scale(1)';
                      }
                    }, 100);
                  }
                }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              />
              {/* 密码可见切换：移动端增大点击区域 */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: isMobile ? '8px' : '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  transition: 'color 0.2s ease, transform 0.2s ease',
                  // 移动端增大点击区域
                  padding: isMobile ? '8px' : '4px',
                  borderRadius: '50%',
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    (e.currentTarget as HTMLButtonElement).style.color = '#6366f1';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-50%) scale(1.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-50%) scale(1)';
                  }
                }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {showPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
          </div>

          {/* 登录按钮：响应式调整 */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: isMobile ? '13px' : '14px',
              fontSize: isMobile ? '15px' : '16px',
              fontWeight: 500,
              color: 'white',
              borderRadius: '8px',
              background: loading ? '#a5b4fc' : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              backgroundSize: loading ? '100% 100%' : '200% 100%',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: loading ? 0.8 : 1,
              boxShadow: isMobile ? '0 4px 12px rgba(99, 102, 241, 0.3)' : '0 4px 14px rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: loading ? 'none' : 'buttonGradient 3s ease infinite',
              // 移动端增大点击区域
              touchAction: 'manipulation',
            }}
            onMouseEnter={(e) => {
              if (!loading && !isMobile) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 18px rgba(99, 102, 241, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && !isMobile) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = isMobile ? '0 4px 12px rgba(99, 102, 241, 0.3)' : '0 4px 14px rgba(99, 102, 241, 0.3)';
              }
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {loading ? (
              <div style={{
                width: '16px',
                height: '16px',
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

        {/* 错误提示 */}
        {error && (
          <p style={{
            color: '#dc2626',
            fontSize: '13px',
            textAlign: 'center',
            marginTop: '0',
            marginBottom: isMobile ? '6px' : '8px',
            padding: '8px 12px',
            backgroundColor: 'rgba(220, 38, 38, 0.05)',
            borderRadius: '6px',
            animation: 'fadeIn 0.3s ease',
          }}>
            {error}
          </p>
        )}

        {/* 底部说明：响应式调整 */}
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontSize: '11px',
            color: '#94a3b8',
            margin: '0',
            lineHeight: '1.5',
          }}>
            个人项目 | 独立开发 | AI小说创作助手
          </p>
          <p style={{
            fontSize: '11px',
            color: '#94a3b8',
            margin: '4px 0 0 0',
            // 移动端换行显示
            whiteSpace: isMobile ? 'normal' : 'nowrap',
          }}>
            前端：Next.js + React + TypeScript | 后端：Flask
          </p>
        </div>
      </div>
    </div>
  );
}