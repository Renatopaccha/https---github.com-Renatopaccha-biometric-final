import { useState, lazy, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Home } from './components/Home';

// PERFORMANCE OPTIMIZATION: Code splitting with React.lazy
// This reduces initial bundle size by loading components only when needed
const DataPreprocessing = lazy(() => import('./components/DataPreprocessing').then(m => ({ default: m.DataPreprocessing })));
const DescriptiveStats = lazy(() => import('./components/DescriptiveStats').then(m => ({ default: m.DescriptiveStats })));
const AIAssistant = lazy(() => import('./components/AIAssistant').then(m => ({ default: m.AIAssistant })));

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [currentView, setCurrentView] = useState<'inicio' | 'preprocesamiento' | 'estadistica' | 'asistente'>('inicio');
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(undefined);

  const handleNavigation = (view: string, chatId?: string) => {
    if (chatId) {
      setSelectedChatId(chatId);
    } else if (view !== 'asistente') {
      // Clear selected chat when navigating away from assistant
      setSelectedChatId(undefined);
    }
    setCurrentView(view as any);
  };

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar — floats visually over the gray background */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        activeView={currentView}
        onNavigate={(view) => handleNavigation(view)}
      />

      {/* Main content area — adapts width automatically */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          currentView={currentView}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
        />

        <main className="flex-1 overflow-auto bg-gray-50">
          {currentView === 'inicio' && <Home />}
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
          }>
            {currentView === 'preprocesamiento' && <DataPreprocessing />}
            {currentView === 'estadistica' && <DescriptiveStats onNavigate={handleNavigation} />}
            {currentView === 'asistente' && <AIAssistant initialChatId={selectedChatId} />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}