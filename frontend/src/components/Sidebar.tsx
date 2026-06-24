import React from 'react';
import { Link } from 'react-router-dom';

interface SidebarProps {
  activeTab: 'worklist' | 'viewer' | 'reports' | 'archive' | 'settings' | 'help';
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab }) => {
  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-sidebar-width bg-[#161b22] border-r border-[#30363D] flex flex-col items-center py-4 space-y-2 z-50">
      <nav className="w-full flex-1 flex flex-col space-y-2">
        {/* Worklist */}
        <Link
          to="/dashboard"
          className={`w-full flex flex-col items-center justify-center p-4 transition-all duration-100 group relative ${
            activeTab === 'worklist'
              ? 'text-primary bg-primary-container/10 border-l-2 border-primary'
              : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-highest/50'
          }`}
          title="Worklist"
        >
          <span 
            className="material-symbols-outlined mb-1 group-hover:scale-110 transition-transform" 
            style={activeTab === 'worklist' ? { fontVariationSettings: '"FILL" 1' } : undefined}
          >
            list_alt
          </span>
          <span className="text-label-caps font-label-caps text-[8px] uppercase">W...</span>
        </Link>

        {/* Viewer */}
        <Link
          to="/viewer"
          className={`w-full flex flex-col items-center justify-center p-4 transition-all duration-100 group relative ${
            activeTab === 'viewer'
              ? 'text-primary bg-primary-container/10 border-l-2 border-primary'
              : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-highest/50'
          }`}
          title="Viewer"
        >
          <span 
            className="material-symbols-outlined mb-1 group-hover:scale-110 transition-transform" 
            style={activeTab === 'viewer' ? { fontVariationSettings: '"FILL" 1' } : undefined}
          >
            visibility
          </span>
          <span className="text-label-caps font-label-caps text-[8px] uppercase">Vie...</span>
        </Link>

        {/* Reports */}
        <Link
          to="/reports"
          className={`w-full flex flex-col items-center justify-center p-4 transition-all duration-100 group relative ${
            activeTab === 'reports'
              ? 'text-primary bg-primary-container/10 border-l-2 border-primary'
              : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-highest/50'
          }`}
          title="Reports"
        >
          <span 
            className="material-symbols-outlined mb-1 group-hover:scale-110 transition-transform" 
            style={activeTab === 'reports' ? { fontVariationSettings: '"FILL" 1' } : undefined}
          >
            description
          </span>
          <span className="text-label-caps font-label-caps text-[8px] uppercase">Re...</span>
        </Link>

        {/* Archive */}
        <Link
          to="/archive"
          className={`w-full flex flex-col items-center justify-center p-4 transition-all duration-100 group relative ${
            activeTab === 'archive'
              ? 'text-primary bg-primary-container/10 border-l-2 border-primary'
              : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-highest/50'
          }`}
          title="Archive"
        >
          <span 
            className="material-symbols-outlined mb-1 group-hover:scale-110 transition-transform" 
            style={activeTab === 'archive' ? { fontVariationSettings: '"FILL" 1' } : undefined}
          >
            inventory_2
          </span>
          <span className="text-label-caps font-label-caps text-[8px] uppercase">Ar...</span>
        </Link>

        {/* Settings */}
        <Link
          to="/settings"
          className={`w-full flex flex-col items-center justify-center p-4 transition-all duration-100 group relative ${
            activeTab === 'settings'
              ? 'text-primary bg-primary-container/10 border-l-2 border-primary'
              : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-highest/50'
          }`}
          title="Settings"
        >
          <span 
            className="material-symbols-outlined mb-1 group-hover:scale-110 transition-transform"
            style={activeTab === 'settings' ? { fontVariationSettings: '"FILL" 1' } : undefined}
          >
            settings
          </span>
          <span className="text-label-caps font-label-caps text-[8px] uppercase">Set...</span>
        </Link>

        {/* Help */}
        <Link
          to="/help"
          className={`w-full flex flex-col items-center justify-center p-4 transition-all duration-100 group relative ${
            activeTab === 'help'
              ? 'text-primary bg-primary-container/10 border-l-2 border-primary'
              : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-highest/50'
          }`}
          title="Help Guide"
        >
          <span 
            className="material-symbols-outlined mb-1 group-hover:scale-110 transition-transform"
            style={activeTab === 'help' ? { fontVariationSettings: '"FILL" 1' } : undefined}
          >
            help
          </span>
          <span className="text-label-caps font-label-caps text-[8px] uppercase">Help</span>
        </Link>
      </nav>

      <div className="mt-auto pb-4">
        <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant flex items-center justify-center overflow-hidden">
          <img
            alt="User Profile"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUEvs4AwVQS_Ib2yNKESYM17DfuuRRdfWAYUdhITklGMewQBz7-HhZsHnw6Jij2vx84fjwLrYo29RR3TtXm_V7Uyu1_1acmga0bvtvL195VfIzbUCv153Cs-kQCOKQ0BEm-etkumv7gdt_dnjWusjIlOT5i_5oyY5T9HXW1N1SBksSzqml6R62P0gEhnSS6tzemKJu9jqZMMkLZwYROhG2E8XhLW1cELkFRDLr_8Z9bgUfgOtn2Ba17VkrO6WgOKpd0ut5Ho1ol4g"
          />
        </div>
      </div>
    </aside>
  );
};
