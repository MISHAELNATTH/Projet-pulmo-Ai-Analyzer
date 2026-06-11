import React from 'react';
import { Link } from 'react-router-dom';

interface SidebarProps {
  activeTab: 'worklist' | 'viewer' | 'reports' | 'archive' | 'settings';
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab }) => {
  return (
    <aside className="fixed left-0 top-0 h-full w-sidebar-width bg-surface-container dark:bg-surface-container-low/70 backdrop-blur-xl border-r border-outline-variant flex flex-col items-center py-panel-padding space-y-stack-gap z-50">
      <div className="mb-6 mt-2 flex flex-col items-center justify-center cursor-pointer group" title="PneumoGuard AI">
        <span className="text-title-sm font-title-sm font-black text-primary uppercase tracking-tighter">PG</span>
      </div>
      
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
          <span className="text-label-caps font-label-caps text-[8px] uppercase">Worklist</span>
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
          <span className="text-label-caps font-label-caps text-[8px] uppercase">Viewer</span>
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
          <span className="text-label-caps font-label-caps text-[8px] uppercase">Reports</span>
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
          <span className="text-label-caps font-label-caps text-[8px] uppercase">Archive</span>
        </Link>

        {/* Settings */}
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className={`w-full flex flex-col items-center justify-center p-4 transition-all duration-100 group relative ${
            activeTab === 'settings'
              ? 'text-primary bg-primary-container/10 border-l-2 border-primary'
              : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-highest/50'
          }`}
          title="Settings"
        >
          <span className="material-symbols-outlined mb-1 group-hover:scale-110 transition-transform">
            settings
          </span>
          <span className="text-label-caps font-label-caps text-[8px] uppercase">Settings</span>
        </a>
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
