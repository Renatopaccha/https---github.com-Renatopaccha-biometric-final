import { LayoutDashboard, Database, BarChart3, FlaskConical, Settings, Sparkles, ChevronLeft, Target } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeView: string;
  onNavigate: (view: 'inicio' | 'preprocesamiento' | 'estadistica' | 'asistente' | 'muestreo' | 'inferencia') => void;
}

const navigationItems = [
  { name: 'Inicio', icon: LayoutDashboard, view: 'inicio' as const },
  { name: 'Preprocesamiento', icon: Database, view: 'preprocesamiento' as const },
  { name: 'Estadística Descriptiva', icon: BarChart3, view: 'estadistica' as const },
  { name: 'Asistente IA', icon: Sparkles, view: 'asistente' as const },
  { name: 'Muestreo', icon: Target, view: 'muestreo' as const },
  { name: 'Inferencia sobre parametros', icon: FlaskConical, view: 'inferencia' as const },
  { name: 'Configuración', icon: Settings, view: null },
];

export function Sidebar({ isOpen, onToggle, activeView, onNavigate }: SidebarProps) {
  return (
    <aside
      className={`relative bg-white shadow-xl border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col h-full ${
        isOpen ? 'w-64' : 'w-0'
      } overflow-hidden`}
    >
      {/* Toggle button — sits on the right edge of the sidebar */}
      <button
        onClick={onToggle}
        className="absolute top-5 -right-0 z-20 w-6 h-6 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
        style={{ transform: 'translateX(50%)' }}
        aria-label={isOpen ? 'Cerrar sidebar' : 'Abrir sidebar'}
      >
        <ChevronLeft
          className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-300 ${
            !isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Inner content wrapper — prevents content from wrapping during collapse */}
      <div className="w-64 flex flex-col h-full flex-shrink-0">
        {/* Logo Section */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-teal-600 to-teal-700 rounded flex items-center justify-center">
              <span className="text-white text-sm">B</span>
            </div>
            <span className="text-gray-900 tracking-tight">Biometric</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3">
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const isActive = item.view === activeView;
              return (
                <li key={item.name}>
                  <button
                    onClick={() => item.view && onNavigate(item.view)}
                    disabled={!item.view}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                      isActive
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    } ${!item.view ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm whitespace-nowrap">{item.name}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 bg-teal-600 rounded-full"></div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-teal-100 to-teal-200 rounded-full flex items-center justify-center">
              <span className="text-teal-700 text-sm">SC</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-900 truncate">Dr. Sara Castro</div>
              <div className="text-xs text-gray-500">Investigadora</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}