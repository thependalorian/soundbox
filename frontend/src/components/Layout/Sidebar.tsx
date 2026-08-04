import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  BuildingStorefrontIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  MapIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth, UserRole } from '../../context/AuthContext';
import { fetchPendingMerchantCount } from '../../api/api';
import { BRAND } from '../../lib/copy/public';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  roles: UserRole[];
}

/**
 * Navigation, grouped by the question each item answers.
 *
 * Two roles do two jobs:
 *
 *  - A **regulator** oversees a payment system. They need coverage, the
 *    review queue, drill-down and returns.
 *  - An **administrator** runs the deployment: accounts, scoring policy, and
 *    whatever is currently broken.
 *
 * Both see the same analytical surface, because the analysis is the product
 * and there is no version of it that is safe for one and not the other.
 *
 * Mirrors the route guards in App.tsx — nav visibility and route access are
 * two views of one rule set.
 */
const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ['regulator', 'admin'] },
  // What is happening on the rails
  { name: 'Payments', href: '/transactions', icon: CurrencyDollarIcon, roles: ['regulator', 'admin'] },
  { name: 'Flagged', href: '/flagged', icon: ExclamationTriangleIcon, roles: ['regulator', 'admin'] },
  // Who and where
  { name: 'Businesses', href: '/merchants', icon: BuildingStorefrontIcon, roles: ['regulator', 'admin'] },
  { name: 'Coverage', href: '/map', icon: MapIcon, roles: ['regulator', 'admin'] },
  // Analysis and returns
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, roles: ['regulator', 'admin'] },
  { name: 'Ask the data', href: '/ask', icon: ChatBubbleLeftRightIcon, roles: ['regulator', 'admin'] },
  { name: 'Reports', href: '/reports', icon: DocumentTextIcon, roles: ['regulator', 'admin'] },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, roles: ['regulator', 'admin'] },
];

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, setOpen }) => {
  const { user } = useAuth();
  const items = navigation.filter((item) => (user ? item.roles.includes(user.role) : false));

  // Applications waiting on a decision. Shown in the nav rather than only on
  // the page, because the failure this queue exists to prevent is an
  // application sitting unseen — which is exactly what happens when the only
  // way to learn the count is to visit the page.
  const [pendingReview, setPendingReview] = useState(0);
  const canReview = user?.role === 'admin' || user?.role === 'regulator';

  useEffect(() => {
    if (!canReview) return;
    fetchPendingMerchantCount()
      .then(setPendingReview)
      .catch(() => {
        // A badge is not worth an error state. The Businesses page states
        // the count authoritatively either way.
        setPendingReview(0);
      });
  }, [canReview]);

  return (
    <div
      className={`${
        open ? 'translate-x-0' : '-translate-x-full'
      } fixed inset-y-0 left-0 z-50 w-[256px] shrink-0 bg-paper border-r border-mist transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
    >
      <div className="flex items-center justify-between h-64 px-20 border-b border-mist">
        <span className="text-heading-sm font-signifier text-ink">{BRAND.name}</span>
        <button onClick={() => setOpen(false)} className="lg:hidden text-ink">
          <XMarkIcon className="w-20 h-20" />
        </button>
      </div>
      <nav className="mt-24 px-12 space-y-4">
        {items.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              `flex items-center px-16 py-12 rounded-inputs text-body font-sohne transition-colors ${
                isActive ? 'bg-brand-gradient-aa text-paper' : 'text-slate hover:bg-blush hover:text-ink'
              }`
            }
          >
            <item.icon className="w-20 h-20 mr-12" />
            <span className="flex-1">{item.name}</span>
            {item.href === '/merchants' && pendingReview > 0 && (
              <span
                className="ml-8 min-w-[20px] px-6 py-2 rounded-buttons bg-peach text-sienna text-caption font-sohne font-450 text-center tabular-nums"
                title={`${pendingReview} awaiting a decision`}
              >
                {pendingReview}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
