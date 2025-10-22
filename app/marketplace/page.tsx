'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';

export default function Marketplace() {
  const { ready, authenticated, user, logout } = usePrivy();
  const router = useRouter();
  const { jwtToken, hospitalProfile, isLoadingProfile, fetchHospitalProfile, clearUserData } = useUser();

  useEffect(() => {
    // Redirect to home if not authenticated
    if (!jwtToken) {
      console.log('No JWT token, redirecting to home');
      router.push('/');
      return;
    }

    // Fetch hospital profile if not already loaded
    if (!hospitalProfile && !isLoadingProfile) {
      fetchHospitalProfile();
    }
  }, [jwtToken, hospitalProfile, isLoadingProfile, fetchHospitalProfile, router]);

  // Redirect if user doesn't have hospital profile after loading
  useEffect(() => {
    if (!isLoadingProfile && jwtToken && !hospitalProfile) {
      console.log('User does not own a hospital, redirecting to home');
      router.push('/');
    }
  }, [isLoadingProfile, jwtToken, hospitalProfile, router]);

  if (!ready || !authenticated || isLoadingProfile || !hospitalProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-black">Kelox</h1>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">{hospitalProfile?.name}</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email?.address}</span>
              <button
                onClick={() => {
                  clearUserData();
                  logout();
                  router.push('/');
                }}
                className="text-sm text-gray-600 hover:text-black"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h2 className="text-3xl font-bold text-black mb-4">Marketplace</h2>
          <p className="text-gray-600">
            Welcome to the Kelox Marketplace. Content coming soon...
          </p>
        </div>
      </main>
    </div>
  );
}

