'use client';
import { useState } from 'react';
import Navbar from '../hall/components/Navbar';

export default function ChatPage() {
  // 历史消息仅由前端维护，系统提示词不在这里初始化
  const [messages, setMessages] = useState<any[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!userInput.trim() || loading) return;

    // 添加用户消息到历史
    const newMessages = [...messages, { role: "user", content: userInput }];
    setMessages(newMessages);
    setLoading(true);
    setUserInput("");

    try {
      // 仅发送历史消息，系统提示词由后端注入
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, temperature: 0.7 })
      });

      const data = await res.json();
      if (data.error) {
        setMessages([...newMessages, { role: "assistant", content: `错误: ${data.error}` }]);
      } else {
        setMessages([...newMessages, { role: "assistant", content: data.response }]);
      }
    } catch (e: any) {
      setMessages([...newMessages, { role: "assistant", content: `请求失败: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar title="AI 创作助手" searchQuery="" setSearchQuery={() => {}} />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        {/* 聊天记录区域 */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-[60vh] overflow-y-auto mb-4">
          {messages.map((msg, index) => (
            <div key={index} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className="inline-block px-4 py-2 rounded-lg">
                <strong className="block text-sm opacity-70">
                  {msg.role === 'system' ? '系统' : msg.role === 'user' ? '你' : 'AI'}
                </strong>
                <p>{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-left text-gray-500">AI正在思考...</div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="输入你的世界观设定需求..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {loading ? '发送中' : '发送'}
          </button>
        </div>
      </main>
    </div>
  );
}