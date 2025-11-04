'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { authenticatedFetch, BACKEND_API } from '@/lib/api';
import NavBar from '@/app/components/NavBar';
import ProductCard from '@/app/components/ProductCard';

interface HospitalProfileResponse {
  id: number;
  name: string;
  address: string;
  companyName: string;
  ownerId: string;
  ownerEmail: string;
  ownerSolanaWallet: string;
  contacts?: any[];
}

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

export default function HospitalProfilePage() {
  const router = useRouter();
  const params = useParams();
  const { jwtToken, hospitalProfile } = useUser();
  const [hospital, setHospital] = useState<HospitalProfileResponse | null>(null);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState(6);
  const [activeTab, setActiveTab] = useState<'selling' | 'sales' | 'purchase'>('selling');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check if the logged-in user is the owner of this hospital
  const isOwner = hospitalProfile?.id === hospital?.id;

  useEffect(() => {
    const fetchHospital = async () => {
      if (!params.name || !jwtToken) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Format name back: replace hyphens with spaces
        const hospitalName = (params.name as string).replace(/-/g, ' ');
        
        // Call API with name as query parameter
        const response = await authenticatedFetch(`/api/hospitals/by-name?name=${encodeURIComponent(hospitalName)}`);
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Unauthorized. Please log in again.');
          } else if (response.status === 404) {
            throw new Error('Hospital not found');
          }
          throw new Error('Failed to fetch hospital profile');
        }

        const data = await response.json();
        setHospital(data);
      } catch (error) {
        console.error('Error fetching hospital profile:', error);
        setError(error instanceof Error ? error.message : 'Failed to load hospital profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHospital();
  }, [params.name, jwtToken]);

  // Fetch hospital products
  useEffect(() => {
    const fetchProducts = async () => {
      if (!hospital?.id) return;

      try {
        setIsLoadingProducts(true);
        const response = await fetch(`${BACKEND_API}/api/marketplace/hospitals/${hospital.id}/products`);
        
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
  }, [hospital?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading hospital profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !hospital) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <div className="text-center">
            <p className="text-gray-600 mb-4">{error || 'Hospital not found'}</p>
            <button
              onClick={() => router.back()}
              className="px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Hospital Info Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Left Column - Hospital Info */}
          <div className="lg:col-span-1">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{hospital.name}</h1>
              <p className="text-sm text-gray-600 mb-1">{hospital.address}</p>
              <p className="text-xs text-gray-500 mb-6">{hospital.companyName}</p>

              {/* Contact Section */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Contact</p>
                {hospital.contacts && hospital.contacts.length > 0 ? (
                  hospital.contacts.map((contact: any, index: number) => (
                    <div key={index} className="text-sm text-gray-600">
                      {contact.name && <p>{contact.name}</p>}
                      {contact.email && <p>{contact.email}</p>}
                      {contact.phone && <p>{contact.phone}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">{hospital.ownerEmail}</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Empty for now */}
          <div className="lg:col-span-2">
            {/* Reserved for future content */}
          </div>
        </div>

        {/* Selling Products Section */}
        <div>
          {isOwner ? (
            /* Owner View - Tabs with Action Buttons */
            <div className="flex items-center justify-between mb-6 border-b border-gray-200">
              {/* Tabs */}
              <div className="flex gap-8">
                <button
                  onClick={() => setActiveTab('selling')}
                  className={`pb-4 px-2 font-medium transition-colors relative cursor-pointer ${
                    activeTab === 'selling'
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Selling products
                  {activeTab === 'selling' && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gray-900 -mb-px"></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('sales')}
                  className={`pb-4 px-2 font-medium transition-colors relative cursor-pointer ${
                    activeTab === 'sales'
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Sales history
                  {activeTab === 'sales' && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gray-900 -mb-px"></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('purchase')}
                  className={`pb-4 px-2 font-medium transition-colors relative cursor-pointer ${
                    activeTab === 'purchase'
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Purchase history
                  {activeTab === 'purchase' && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gray-900 -mb-px"></div>
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pb-4">
                <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer text-sm font-medium">
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
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" 
                    />
                  </svg>
                  Import csv
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer text-sm font-medium">
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
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" 
                    />
                  </svg>
                  List new product
                </button>
              </div>
            </div>
          ) : (
            /* Non-Owner View - Simple Header */
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Selling products</h2>
              {products.length > 0 && (
                <p className="text-sm text-gray-600">
                  showing {Math.min(displayedProducts, products.length)}/{products.length}
                </p>
              )}
            </div>
          )}

          {/* Product Count for Owner */}
          {isOwner && activeTab === 'selling' && products.length > 0 && (
            <div className="flex justify-end mb-4">
              <p className="text-sm text-gray-600">
                showing {Math.min(displayedProducts, products.length)}/{products.length}
              </p>
            </div>
          )}

          {/* Show content based on active tab or if not owner */}
          {(!isOwner || activeTab === 'selling') && (
            <>
              {isLoadingProducts ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading products...</p>
                  </div>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No products available from this hospital.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {products.slice(0, displayedProducts).map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>

                  {/* Show More Button */}
                  {displayedProducts < products.length && (
                    <div className="flex justify-center">
                      <button
                        onClick={() => setDisplayedProducts(prev => Math.min(prev + 6, products.length))}
                        className="px-8 py-3 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        show more
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Sales History Tab Content */}
          {isOwner && activeTab === 'sales' && (
            <div className="text-center py-12">
              <p className="text-gray-600">Sales history coming soon...</p>
            </div>
          )}

          {/* Purchase History Tab Content */}
          {isOwner && activeTab === 'purchase' && (
            <div className="text-center py-12">
              <p className="text-gray-600">Purchase history coming soon...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

