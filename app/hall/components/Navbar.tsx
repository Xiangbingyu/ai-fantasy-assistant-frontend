// components/Navbar.tsx
interface NavbarProps {
    title: string;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

export default function Navbar({ title, searchQuery, setSearchQuery }: NavbarProps) {
    return (
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                
                <div className="relative w-full max-w-md mx-4">
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