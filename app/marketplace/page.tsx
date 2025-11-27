'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState, useMemo } from 'react';
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
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('');
  const [minShelfLife, setMinShelfLife] = useState<number | null>(null);

  // Get unique manufacturers and hospitals from products
  const { manufacturers, hospitals } = useMemo(() => {
    const manufacturerSet = new Set<string>();
    const hospitalSet = new Set<string>();
    
    products.forEach(product => {
      if (product.manufacturer) {
        manufacturerSet.add(product.manufacturer);
      }
      if (product.sellerHospitalName) {
        hospitalSet.add(product.sellerHospitalName);
      }
    });
    
    return {
      manufacturers: Array.from(manufacturerSet).sort(),
      hospitals: Array.from(hospitalSet).sort()
    };
  }, [products]);

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search filter (only if 3+ characters)
      if (searchQuery.length >= 3) {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesManufacturer = product.manufacturer?.toLowerCase().includes(query) || false;
        const matchesCode = product.code.toLowerCase().includes(query);
        
        if (!matchesName && !matchesManufacturer && !matchesCode) {
          return false;
        }
      }
      
      // Manufacturer filter
      if (selectedManufacturer && product.manufacturer !== selectedManufacturer) {
        return false;
      }
      
      // Hospital filter
      if (selectedHospital && product.sellerHospitalName !== selectedHospital) {
        return false;
      }
      
      // Minimum shelf life filter
      if (minShelfLife !== null && minShelfLife > 0) {
        const expiryDate = new Date(product.expiryDate);
        const today = new Date();
        const minExpiryDate = new Date(today);
        minExpiryDate.setMonth(minExpiryDate.getMonth() + minShelfLife);
        
        if (expiryDate < minExpiryDate) {
          return false;
        }
      }
      
      return true;
    });
  }, [products, searchQuery, selectedManufacturer, selectedHospital, minShelfLife]);

  // Check if any filters are active
  const hasActiveFilters = searchQuery.length >= 3 || selectedManufacturer || selectedHospital || (minShelfLife !== null && minShelfLife > 0);

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedManufacturer('');
    setSelectedHospital('');
    setMinShelfLife(null);
  };

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
            {/* Search Bar */}
            <div className={`relative bg-white border border-gray-300 shadow-sm hover:shadow-md transition-all ${showFilters ? 'rounded-t-3xl rounded-b-none border-b-0' : 'rounded-full'}`}>
              <div className="flex items-center px-7 py-2.5">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-900 mb-0.5">Search</div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="blood pressure, thermometer, scissors ..."
                    className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {/* Filter Button */}
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`w-10 h-10 rounded-full transition-colors flex items-center justify-center cursor-pointer ${showFilters ? 'bg-gray-200 text-black' : 'bg-black text-white hover:bg-gray-800'}`}
                  >
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
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" 
                      />
                    </svg>
                  </button>
                  {/* Search Button */}
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
              
              {/* Filters Panel */}
              {showFilters && (
                <div className="border-t border-gray-200 px-7 py-5 bg-white rounded-b-3xl">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Manufacturer Filter */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-2">
                        Manufacturer
                      </label>
                      <select
                        value={selectedManufacturer}
                        onChange={(e) => setSelectedManufacturer(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300 cursor-pointer appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                      >
                        <option value="">All manufacturers</option>
                        {manufacturers.map(manufacturer => (
                          <option key={manufacturer} value={manufacturer}>
                            {manufacturer}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Hospital Seller Filter */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-2">
                        Hospital Seller
                      </label>
                      <select
                        value={selectedHospital}
                        onChange={(e) => setSelectedHospital(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300 cursor-pointer appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                      >
                        <option value="">All hospitals</option>
                        {hospitals.map(hospital => (
                          <option key={hospital} value={hospital}>
                            {hospital}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Minimum Shelf Life Filter */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-2">
                        Minimum Shelf Life
                      </label>
                      <select
                        value={minShelfLife ?? ''}
                        onChange={(e) => setMinShelfLife(e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300 cursor-pointer appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                      >
                        <option value="">Any expiry date</option>
                        <option value="1">1+ month</option>
                        <option value="2">2+ months</option>
                        <option value="3">3+ months</option>
                        <option value="6">6+ months</option>
                        <option value="12">12+ months</option>
                        <option value="24">24+ months</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Active Filters Indicator & Clear Button */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between mt-4 px-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-600">
                    Showing {filteredProducts.length} of {products.length} products
                  </span>
                  {searchQuery.length >= 3 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-black text-white text-xs rounded-full">
                      Search: &ldquo;{searchQuery}&rdquo;
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}
                  {selectedManufacturer && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-black text-white text-xs rounded-full">
                      {selectedManufacturer}
                      <button 
                        onClick={() => setSelectedManufacturer('')}
                        className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}
                  {selectedHospital && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-black text-white text-xs rounded-full">
                      {selectedHospital}
                      <button 
                        onClick={() => setSelectedHospital('')}
                        className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}
                  {minShelfLife !== null && minShelfLife > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-black text-white text-xs rounded-full">
                      {minShelfLife}+ months shelf life
                      <button 
                        onClick={() => setMinShelfLife(null)}
                        className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}
                </div>
                <button 
                  onClick={clearAllFilters}
                  className="text-sm text-gray-600 hover:text-black transition-colors underline cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            )}
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
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            {hasActiveFilters ? (
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-gray-600 mb-4">No products match your search criteria.</p>
                <button 
                  onClick={clearAllFilters}
                  className="px-6 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <p className="text-gray-600 text-center">No products available at the moment.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

