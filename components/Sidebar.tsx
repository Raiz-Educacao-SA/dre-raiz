
import React from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  TableProperties,
  LineChart,
  History,
  ReceiptText,
  Brain,
  LogOut,
  User as UserIcon,
  Shield,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { ViewType } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  selectedBrand: string;
  pendingCount?: number;
  isDrawer?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, selectedBrand, pendingCount = 0, isDrawer = false, onClose }) => {
  const { user, signOut, isAdmin } = useAuth();

  const menuItems = [
    { id: 'soma_tags',     label: 'DRE Gerencial',      icon: TableProperties },
    { id: 'movements',     label: 'Lançamentos',         icon: ReceiptText },
    { id: 'manual_changes',label: 'Aprovações',          icon: History, badge: pendingCount },
    ...(isAdmin ? [
      { id: 'analysis',      label: 'Análise Financeira', icon: FileText },
      { id: 'dashboard',     label: 'Dashboard',          icon: LayoutDashboard },
      { id: 'forecasting',   label: 'Forecasting',        icon: LineChart },
      { id: 'executive_dashboard', label: 'Painel Executivo', icon: TrendingUp },
      { id: 'agent_team', label: 'Equipe IA', icon: Brain },
      { id: 'admin', label: 'Admin', icon: Shield },
    ] : []),
  ];

  const handleNavClick = (viewId: string) => {
    setCurrentView(viewId as ViewType);
    if (isDrawer && onClose) {
      onClose();
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col" style={{ borderColor: 'var(--color-gray-200)' }}>
      <div className="p-6 flex items-center gap-3">
        <div className="p-2 rounded-lg shadow-lg" style={{
          backgroundColor: 'var(--color-primary-500)',
          boxShadow: 'var(--shadow-primary-sm)',
          borderRadius: 'var(--radius-default)'
        }}>
          <GraduationCap className="text-white w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-black leading-none tracking-tighter" style={{ color: 'var(--color-primary-500)' }}>RAIZ</h1>
          <span className="text-[10px] font-bold uppercase tracking-widest -mt-0.5" style={{ color: 'var(--color-secondary-500)' }}>educação</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 transition-all ${
                isActive
                  ? 'font-bold shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
              style={isActive ? {
                backgroundColor: 'var(--color-primary-50)',
                color: 'var(--color-primary-500)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)',
                transition: 'var(--transition-all)'
              } : {
                borderRadius: 'var(--radius-lg)',
                transition: 'var(--transition-all)'
              }}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} style={{ color: isActive ? 'var(--color-primary-500)' : 'var(--color-gray-400)' }} />
                <span className="text-[11px] uppercase font-black tracking-tight">{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span
                  className="flex h-5 w-5 items-center justify-center text-[10px] font-black text-white animate-pulse"
                  style={{
                    backgroundColor: 'var(--color-primary-500)',
                    borderRadius: 'var(--radius-full)'
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 space-y-3" style={{ borderTop: '1px solid var(--color-gray-100)' }}>
        {/* User Profile */}
        <div className="bg-white p-3" style={{
          border: '1px solid var(--color-gray-200)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <div className="flex items-center gap-3 mb-3">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.name}
                className="w-10 h-10 rounded-full"
                style={{
                  border: '2px solid var(--color-secondary-500)',
                  borderRadius: 'var(--radius-full)'
                }}
              />
            ) : (
              <div
                className="w-10 h-10 flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--color-secondary-500)',
                  borderRadius: 'var(--radius-full)'
                }}
              >
                <UserIcon className="text-white" size={20} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">{user?.name}</p>
              <p className="text-[9px] text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
              user?.role === 'admin' ? 'bg-purple-100 text-purple-700' :
              user?.role === 'manager' ? 'bg-blue-100 text-blue-700' :
              user?.role === 'approver' ? 'bg-indigo-100 text-indigo-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {user?.role === 'admin' ? 'Administrador' :
               user?.role === 'manager' ? 'Gestor' :
               user?.role === 'approver' ? 'Aprovador' :
               'Visualizador'}
            </span>
          </div>

          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-bold uppercase"
            style={{
              backgroundColor: 'var(--color-gray-100)',
              color: 'var(--color-gray-700)',
              borderRadius: 'var(--radius-default)',
              transition: 'var(--transition-all)',
              border: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-error-50)';
              e.currentTarget.style.color = 'var(--color-error-600)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-gray-100)';
              e.currentTarget.style.color = 'var(--color-gray-700)';
            }}
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>

      </div>
    </aside>
  );
};

export default Sidebar;
