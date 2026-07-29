import React from 'react';
import { Bars3Icon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const ROLE_LABEL: Record<string, string> = {
  merchant: 'Merchant',
  regulator: 'Regulator',
  admin: 'Admin',
};

const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-paper border-b-0 h-64 flex items-center px-24 relative">
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden mr-16 text-ink">
        <Bars3Icon className="w-20 h-20" />
      </button>
      <div className="flex-1" />
      <div className="flex items-center gap-16">
        {user && (
          <span className="text-caption font-sohne text-ash hidden sm:block">
            {ROLE_LABEL[user.role]} portal
          </span>
        )}
        <span className="text-caption font-sohne text-slate hidden sm:block">{user?.name}</span>
        <UserCircleIcon className="w-32 h-32 text-slate" />
        <button onClick={logout} className="text-caption font-sohne text-slate hover:text-ink">
          Logout
        </button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-brand-gradient" />
    </header>
  );
};

export default Header;
