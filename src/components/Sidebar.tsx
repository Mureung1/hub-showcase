import React from 'react';
import { Sparkles, Shirt, BookOpen, NotebookPen, Settings } from 'lucide-react';
import { TabType, UserProfile } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  profile: UserProfile;
  totalClothes: number;
}

interface MenuItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<any>;
  badge?: number;
}

export default function Sidebar({ activeTab, setActiveTab, profile, totalClothes }: SidebarProps) {
  const menuItems: MenuItem[] = [
    { id: 'today', label: "Today's Look", icon: Sparkles },
    { id: 'wardrobe', label: 'Wardrobe', icon: Shirt, badge: totalClothes },
    { id: 'inspiration', label: 'Inspiration', icon: BookOpen },
    { id: 'diary', label: 'Diary', icon: NotebookPen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed left-0 top-0 h-full z-40 flex flex-col p-5 bg-surface-container w-64 rounded-r-[40px] shadow-sm hidden md:flex border-r border-secondary-container/60">
      
      {/* Mini Profile Section */}
      <div className="mb-12 pt-8 pl-4">
        <div className="w-16 h-16 rounded-full mb-4 bg-secondary-container overflow-hidden border-4 border-white shadow-md relative group">
          <img
            alt={profile.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            src={profile.avatar}
          />
          <div className="absolute inset-0 bg-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
        <h2 className="font-serif font-bold text-secondary text-lg leading-tight">{profile.name}</h2>
        <p className="text-[12px] text-primary/80 italic mt-0.5">{profile.subtitle}</p>
      </div>

      {/* Menu Navigation List */}
      <div className="flex flex-col gap-4">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full px-5 py-3 rounded-full flex items-center justify-between transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container rotate-2 shadow-sm font-semibold'
                  : 'text-primary hover:bg-secondary-container/30 hover:rotate-1'
              }`}
            >
              <div className="flex items-center gap-3">
                <IconComponent className={`w-5 h-5 ${isActive ? 'text-secondary animate-pulse' : 'text-primary/80'}`} />
                <span className="font-sans text-sm tracking-wide">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="text-[10px] font-bold bg-white text-secondary px-2 py-0.5 rounded-full border border-secondary-container">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sweet margin doodle on the sidebar */}
      <div className="mt-auto pl-4 pb-4 select-none opacity-40">
        <div className="text-[10px] text-secondary font-serif uppercase tracking-widest">
          Est. 2026 
        </div>
        <div className="text-[9px] text-primary mt-1 font-serif">
          Style is a way to say who you are without having to speak.
        </div>
      </div>
    </nav>
  );
}
