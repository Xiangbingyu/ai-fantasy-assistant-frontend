// components/FilterBar.tsx
import { useState } from 'react';

interface FilterBarProps {
    sortBy: string;
    setSortBy: (sort: string) => void;
    tags: string[];
    selectedTags: string[];
    setSelectedTags: (tags: string[]) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

export default function FilterBar({
    sortBy,
    setSortBy,
    tags,
    selectedTags,
    setSelectedTags,
    searchQuery,
    setSearchQuery
}: FilterBarProps) {
    const [showAllTags, setShowAllTags] = useState(false);

    return (
        <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 py-2">
            <div className="container mx-auto px-4">
                <div className="flex flex-wrap items-center gap-4">
                    {/* 搜索框 */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="搜索世界名称或标签..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="px-4 py-1 pl-10 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                        />
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    
                    {/* 排序筛选 */}
                    <div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                        >
                            <option value="热度">按热度排序</option>
                            <option value="更新时间">按更新时间排序</option>
                        </select>
                    </div>
                    
                    {/* 标签筛选（支持多选） */}
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400">标签:</span>

                        <div className="flex flex-wrap gap-2 max-w-full">
                            {tags.slice(0, showAllTags ? tags.length : 5).map(tag => {
                                const isSelected = selectedTags.includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        onClick={() =>
                                            setSelectedTags(
                                                isSelected
                                                    ? selectedTags.filter(t => t !== tag)
                                                    : [...selectedTags, tag]
                                            )
                                        }
                                        className={`px-2 py-1 rounded text-sm ${
                                            isSelected
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                );
                            })}

                            {tags.length > 5 && (
                                <button
                                    onClick={() => setShowAllTags(!showAllTags)}
                                    className="px-2 py-1 text-sm text-blue-500 hover:underline"
                                >
                                    {showAllTags ? '收起' : `+${tags.length - 5}个标签`}
                                </button>
                            )}

                            {selectedTags.length > 0 && (
                                <button
                                    onClick={() => setSelectedTags([])}
                                    className="px-2 py-1 text-sm text-gray-500 hover:text-red-500"
                                >
                                    清除标签筛选
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}