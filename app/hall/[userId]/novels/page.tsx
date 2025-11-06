'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';

interface Novel {
  id: number;
  chapter_id: number;
  user_id: number;
  title: string;
  content: string;
  create_time: string;
  chapter_name?: string;
  world_name?: string;
  world_id?: number;
}

export default function NovelsPage() {
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const currentUserId = Number(params.userId || '0');
  
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 获取所有小说数据
  useEffect(() => {
    const fetchNovels = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/db/novels');
        if (!res.ok) throw new Error('获取小说列表失败');
        
        const data = await res.json();
        setNovels(data);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : '获取小说数据异常';
        setError(errMsg);
        console.error(errMsg, err);
      } finally {
        setLoading(false);
      }
    };

    fetchNovels();
  }, []);

  // 查看小说详情
  const handleViewNovel = (novel: Novel) => {
    setSelectedNovel(novel);
  };

  // 关闭详情弹窗
  const handleCloseDetail = () => {
    setSelectedNovel(null);
  };

  // 返回上一页
  const handleBack = () => {
    router.push(`/hall/${currentUserId}`);
  };

  // 根据搜索词过滤小说
  const filteredNovels = novels.filter(novel => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (novel.title?.toLowerCase().includes(query) || false) ||
      novel.content.toLowerCase().includes(query) ||
      (novel.world_name?.toLowerCase().includes(query) || false) ||
      (novel.chapter_name?.toLowerCase().includes(query) || false) ||
      novel.user_id.toString().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <div className="w-12 h-12 mb-4 text-indigo-600 animate-spin">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="text-gray-600 text-lg">正在加载小说集...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <div className="w-16 h-16 mb-4 text-red-500">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
            <path d="M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-red-500 text-lg mb-6">加载失败：{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
        >
          重试加载
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar
        title="小说集"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <div className="container mx-auto px-4 py-2">
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
          </svg>
          返回
        </button>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">所有小说</h1>
        
        {filteredNovels.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNovels.map(novel => (
              <NovelCard 
                key={novel.id} 
                novel={novel} 
                onClick={() => handleViewNovel(novel)} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <div className="w-20 h-20 mx-auto mb-4 text-gray-300">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-gray-500 text-lg">{searchQuery ? '没有找到匹配的小说' : '暂无小说内容'}</p>
          </div>
        )}
      </div>
      
      {/* 小说详情弹窗 */}
      {selectedNovel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-gray-800">{selectedNovel.title || '未命名小说'}</h3>
                <button 
                  onClick={handleCloseDetail} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>用户ID: {selectedNovel.user_id}</span>
                {selectedNovel.world_name && <span>世界: {selectedNovel.world_name}</span>}
                {selectedNovel.chapter_name && <span>章节: {selectedNovel.chapter_name}</span>}
                <span>{new Date(selectedNovel.create_time).toLocaleString()}</span>
              </div>
            </div>
            <div className="p-6">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {selectedNovel.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 小说卡片组件
function NovelCard({ novel, onClick }: { novel: Novel, onClick: () => void }) {
  // 截取部分内容作为预览
  const getPreview = (content: string, maxLength: number = 100) => {
    if (!content) return '暂无内容';
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
      onClick={onClick}
    >
      <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-1">
        {novel.title || '未命名小说'}
      </h3>
      <p className="text-gray-500 text-sm mb-3 line-clamp-3">
        {getPreview(novel.content)}
      </p>
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>用户 {novel.user_id}</span>
        <span>{new Date(novel.create_time).toLocaleDateString()}</span>
      </div>
      {(novel.world_name || novel.chapter_name) && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {novel.world_name && (
            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs">
              {novel.world_name}
            </span>
          )}
          {novel.chapter_name && (
            <span className="px-2 py-1 bg-green-50 text-green-600 rounded-md text-xs">
              {novel.chapter_name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}