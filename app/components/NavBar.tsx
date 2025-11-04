'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface NavBarProps {
  showBorder?: boolean;
}

export default function NavBar({ showBorder = true }: NavBarProps) {
  const router = useRouter();

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
          <div className="flex-shrink-0">
            <button className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-300 rounded-full shadow-sm hover:shadow-md transition-shadow cursor-pointer">
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
          </div>
        </div>
      </div>
    </header>
  );
}

