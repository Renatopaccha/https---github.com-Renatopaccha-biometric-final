import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Home } from './components/Home';
import { DataPreprocessing } from './components/DataPreprocessing';
import { DescriptiveStats } from './components/DescriptiveStats';
import { AIAssistant } from './components/AIAssistant';

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [currentView, setCurrentView] = useState<'inicio' | 'preprocesamiento' | 'estadistica' | 'asistente'>('inicio');

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeView={currentView}
        onNavigate={setCurrentView}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentView={currentView} />

        <main className="flex-1 overflow-auto bg-gray-50">
          {currentView === 'inicio' && <Home />}
          {currentView === 'preprocesamiento' && <DataPreprocessing />}
          {currentView === 'estadistica' && <DescriptiveStats />}
          {currentView === 'asistente' && <AIAssistant />}
        </main>
      </div>
    </div>
  );
}