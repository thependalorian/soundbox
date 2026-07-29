import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  DevicePhoneMobileIcon,
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
 * Navigation, by what each role actually does.
 *
 * These are three different jobs, not three permission levels on one job:
 *
 *  - A **seller** runs a stall. They want to know they were paid and that
 *    their box is working. They have no interest in national coverage, and
 *    "Analytics" is the wrong word for what they need — "Takings" is.
 *  - A **regulator** oversees a payment system. They need coverage, drill-
 *    down and returns. They do not manage anyone's device and never see a
 *    single business's till.
 *  - An **administrator** runs the deployment: the fleet, onboarding, and
 *    whatever is currently broken.
 *
 * An earlier version gave all three the same Analytics and Settings pages
 * with a few conditionals inside. That is how a product ends up serving
 * nobody properly.
 *
 * Mirrors the route guards in App.tsx — nav visibility and route access are
 * two views of one rule set.
 */
const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ['merchant', 'regulator', 'admin'] },
  // Seller
  { name: 'My payments', href: '/transactions', icon: CurrencyDollarIcon, roles: ['merchant'] },
  { name: 'My box', href: '/devices', icon: DevicePhoneMobileIcon, roles: ['merchant'] },
  { name: 'Takings', href: '/analytics', icon: ChartBarIcon, roles: ['merchant'] },
  // Oversight
  { name: 'Businesses', href: '/merchants', icon: BuildingStorefrontIcon, roles: ['regulator', 'admin'] },
  { name: 'Coverage', href: '/map', icon: MapIcon, roles: ['regulator', 'admin'] },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, roles: ['regulator', 'admin'] },
  { name: 'Ask the data', href: '/ask', icon: ChatBubbleLeftRightIcon, roles: ['regulator', 'admin'] },
  { name: 'Reports', href: '/reports', icon: DocumentTextIcon, roles: ['regulator', 'admin'] },
  // Operations
  { name: 'Devices', href: '/devices', icon: DevicePhoneMobileIcon, roles: ['admin'] },
  { name: 'Payments', href: '/transactions', icon: CurrencyDollarIcon, roles: ['admin'] },
  { name: 'Flagged', href: '/flagged', icon: ExclamationTriangleIcon, roles: ['merchant', 'admin'] },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, roles: ['merchant', 'regulator', 'admin'] },
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
