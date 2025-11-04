'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { authenticatedFetch } from '@/lib/api';
import NavBar from '@/app/components/NavBar';
import ProductCard from '@/app/components/ProductCard';

interface ProductResponse {
  id: string;
  name: string;
  code: string;
  sellerHospitalName: string;
  sellerHospitalId: number;
  sellerVerified?: boolean;
  unit: string;
  quantity: number;
  expiryDate: string;
  price: number;
  currency: string;
  manufacturer?: string;
  brandName?: string;
  lotNumber?: string;
  description?: string;
}

export default function Marketplace() {
  const { ready, authenticated, user, logout } = usePrivy();
  const router = useRouter();
  const { jwtToken, hospitalProfile, isLoadingProfile, fetchHospitalProfile, clearUserData } = useUser();
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

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

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      if (!jwtToken || !hospitalProfile) return;

      try {
        setIsLoadingProducts(true);
        const response = await authenticatedFetch('/api/marketplace/products');
        
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [jwtToken, hospitalProfile]);

  // Redirect if user doesn't have hospital profile after loading
  useEffect(() => {
    if (!isLoadingProfile && jwtToken && !hospitalProfile) {
      console.log('User does not own a hospital, redirecting to home');
      router.push('/');
    }
  }, [isLoadingProfile, jwtToken, hospitalProfile, router]);

  if (!ready || !authenticated || isLoadingProfile || !hospitalProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* NavBar */}
      <NavBar showBorder={false} />
      
      {/* Search Bar Section */}
      <div className="bg-primary border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-6">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-center bg-white border border-gray-300 rounded-full shadow-sm hover:shadow-md transition-shadow px-7 py-2.5">
              <div className="flex-1">
                <div className="text-xs font-semibold text-gray-900 mb-0.5">Search</div>
                <input
                  type="text"
                  placeholder="blood pressure, thermometer, scissors ..."
                  className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button className="w-10 h-10 bg-black text-white rounded-full hover:bg-gray-800 transition-colors flex items-center justify-center cursor-pointer">
                  <svg 
                    className="w-4 h-4" 
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
                </button>
                <button className="w-10 h-10 bg-black text-white rounded-full hover:bg-gray-800 transition-colors flex items-center justify-center cursor-pointer">
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoadingProducts ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading products...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <p className="text-gray-600 text-center">No products available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

