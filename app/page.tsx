'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/db/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (res.ok && data.user_id) {
                router.push(`/hall/${data.user_id}`);
            } else {
                setError(data?.error || '登录失败');
            }
        } catch (err) {
            setError('网络错误，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 360, margin: '40px auto', padding: 16 }}>
            <h1 style={{ marginBottom: 16 }}>登录 / 注册</h1>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 12 }}>
                    <label>
                        用户名
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="输入用户名"
                            style={{ width: '100%', padding: 8, marginTop: 6 }}
                            required
                        />
                    </label>
                </div>
                <div style={{ marginBottom: 12 }}>
                    <label>
                        密码
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="输入密码"
                            style={{ width: '100%', padding: 8, marginTop: 6 }}
                            required
                        />
                    </label>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    style={{ width: '100%', padding: 10 }}
                >
                    {loading ? '处理中...' : '登录 / 注册'}
                </button>
            </form>
            {error && (
                <p style={{ color: 'red', marginTop: 12 }}>
                    {error}
                </p>
            )}
        </div>
    );
}