'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/contexts/UserContext';

interface NavBarProps {
  showBorder?: boolean;
}

export default function NavBar({ showBorder = true }: NavBarProps) {
  const router = useRouter();
  const { logout } = usePrivy();
  const { clearUserData, hospitalProfile } = useUser();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleLogout = () => {
    clearUserData();
    logout();
    router.push('/');
  };

  return (
    <header className={`bg-primary ${showBorder ? 'border-b border-gray-200' : ''}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between py-6">
          {/* Logo */}
          <div className="flex-shrink-0">
            <button 
              onClick={() => router.push('/marketplace')}
              className="cursor-pointer"
            >
              <Image
                src="/keloxlogoplatform.svg"
                alt="Kelox"
                width={140}
                height={38}
                priority
                className="object-contain"
              />
            </button>
          </div>

          {/* Menu Button */}
          <div className="flex-shrink-0 relative" ref={menuRef}>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-300 rounded-full shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <svg 
                className="w-5 h-5 text-gray-700" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 6h16M4 12h16M4 18h16" 
                />
              </svg>
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                <svg 
                  className="w-5 h-5 text-white" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-gray-200 py-2 z-50">
                {/* Profile */}
                <button
                  onClick={() => {
                    if (hospitalProfile) {
                      const formattedName = hospitalProfile.name.replace(/\s+/g, '-');
                      router.push(`/hospital/${formattedName}`);
                    }
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-900">Profile</span>
                </button>

                {/* Cart */}
                <button
                  onClick={() => {
                    router.push('/cart');
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-gray-900">Cart</span>
                </button>

                {/* My Offers */}
                <button
                  onClick={() => {
                    router.push('/my-offers');
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-gray-900">My Offers</span>
                </button>

                {/* Help Center */}
                <button
                  onClick={() => {
                    router.push('/help-center');
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-900">Help Center</span>
                </button>

                {/* Divider */}
                <div className="my-2 border-t border-gray-200"></div>

                {/* Log out */}
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors text-gray-900 cursor-pointer"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

