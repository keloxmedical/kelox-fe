'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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

interface DeliveryAddressDto {
  id: number;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface OrderItemDto {
  id: number;
  product: {
    id: number;
    name: string;
    code: string;
    sellerHospitalName: string;
    expiryDate: string;
    unit: string;
  };
  quantity: number;
  price: number;
  type: string;
  offerId: string | null;
}

type OrderStatus = 
  | 'CALCULATING_LOGISTICS'
  | 'CONFIRMING_PAYMENT'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELED';

interface OrderResponse {
  id: string;
  hospitalId: number;
  hospitalName: string;
  deliveryAddress: DeliveryAddressDto;
  items: OrderItemDto[];
  createdAt: string;
  completedAt: string | null;
  status: OrderStatus;
  paid: boolean;
  productsCost: number;
  platformFee: number;
  deliveryFee: number | null;
  totalCost: number | null;
}

interface SalesHistoryResponse {
  orderId: string;
  buyerHospitalId: number;
  buyerHospitalName: string;
  soldItems: OrderItemDto[];
  createdAt: string;
  completedAt: string | null;
  status: OrderStatus;
  paid: boolean;
  totalSalesAmount: number;
}

export default function HospitalProfilePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { jwtToken, hospitalProfile, isLoadingProfile } = useUser();
  const [hospital, setHospital] = useState<HospitalProfileResponse | null>(null);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [salesHistory, setSalesHistory] = useState<SalesHistoryResponse[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState(6);
  const [activeTab, setActiveTab] = useState<'selling' | 'sales' | 'purchase'>('selling');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  
  // Check if the logged-in user is the owner of this hospital
  const isOwner = hospitalProfile?.id === hospital?.id;

  // Wait for user context to initialize on page load
  useEffect(() => {
    // Give the context a moment to initialize on first load
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Set initial tab from URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'purchase' && isOwner) {
      setActiveTab('purchase');
    }
  }, [searchParams, isOwner]);

  useEffect(() => {
    const fetchHospital = async () => {
      // Wait for initialization to complete
      if (isInitializing) {
        return;
      }

      if (!params.name) {
        setIsLoading(false);
        return;
      }

      if (!jwtToken) {
        setIsLoading(false);
        setError('Please log in to view hospital profiles');
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
          } else if (response.status === 500) {
            throw new Error('Server error. Please try again later.');
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
  }, [params.name, jwtToken, isInitializing]);

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

  // Fetch orders if owner
  useEffect(() => {
    const fetchOrders = async () => {
      // Wait for initialization to complete
      if (isInitializing) return;
      
      if (!isOwner || !jwtToken) return;

      try {
        setIsLoadingOrders(true);
        const response = await authenticatedFetch('/api/shop/orders');
        
        if (response.ok) {
          const data = await response.json();
          setOrders(data);
        } else {
          console.warn(`Failed to fetch orders: ${response.status} - ${response.statusText}`);
          // Silently fail - orders are optional, don't break the page
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        // Silently fail - orders are optional, don't break the page
      } finally {
        setIsLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [isOwner, jwtToken, isInitializing]);

  // Fetch sales history if owner
  useEffect(() => {
    const fetchSalesHistory = async () => {
      // Wait for initialization to complete
      if (isInitializing) return;
      
      if (!isOwner || !jwtToken) return;

      try {
        setIsLoadingSales(true);
        const response = await authenticatedFetch('/api/shop/sales-history');
        
        if (response.ok) {
          const data = await response.json();
          setSalesHistory(data);
        } else {
          console.warn(`Failed to fetch sales history: ${response.status} - ${response.statusText}`);
          // Silently fail - sales history is optional, don't break the page
        }
      } catch (error) {
        console.error('Error fetching sales history:', error);
        // Silently fail - sales history is optional, don't break the page
      } finally {
        setIsLoadingSales(false);
      }
    };

    fetchSalesHistory();
  }, [isOwner, jwtToken, isInitializing]);

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
                  className={`pb-4 px-2 font-medium transition-colors relative cursor-pointer flex items-center gap-2 ${
                    activeTab === 'purchase'
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Purchase history
                  {(() => {
                    const pendingCount = orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELED').length;
                    return pendingCount > 0 && (
                      <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                        {pendingCount} pending {pendingCount === 1 ? 'order' : 'orders'}
                      </span>
                    );
                  })()}
                  {activeTab === 'purchase' && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gray-900 -mb-px"></div>
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pb-4">
                <button 
                  onClick={() => setIsCsvModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer text-sm font-medium"
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
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" 
                    />
                  </svg>
                  Add new products
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
            <>
              {isLoadingSales ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading sales history...</p>
                  </div>
                </div>
              ) : salesHistory.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No sales history yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {salesHistory.map((sale) => {
                    const totalCost = sale.totalSalesAmount;
                    const totalWhole = Math.floor(totalCost);
                    const totalCents = Math.round((totalCost - totalWhole) * 100);

                    const statusInfo: Record<OrderStatus, { color: string; text: string; icon?: string }> = {
                      'CALCULATING_LOGISTICS': { 
                        color: 'bg-blue-50 border-blue-200', 
                        text: 'Calculating logistics cost',
                        icon: 'blue'
                      },
                      'CONFIRMING_PAYMENT': { 
                        color: 'bg-yellow-50 border-yellow-200', 
                        text: 'Requires your action once completed',
                        icon: 'yellow'
                      },
                      'IN_TRANSIT': { 
                        color: 'bg-orange-50 border-orange-200', 
                        text: 'Order in transit',
                        icon: 'orange'
                      },
                      'COMPLETED': { 
                        color: 'bg-green-50 border-green-200', 
                        text: 'Order completed',
                        icon: 'green'
                      },
                      'CANCELED': { 
                        color: 'bg-gray-50 border-gray-200', 
                        text: 'Order canceled',
                        icon: 'gray'
                      }
                    };
                    
                    return (
                      <div key={sale.orderId} className={`border-2 rounded-2xl p-6`}>
                        {/* Order Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className="text-base font-semibold text-gray-900">
                                Sale #{sale.orderId.substring(0, 13)}-...
                              </h3>
                              {/* Status Badge - Compact */}
                              {sale.status === 'CALCULATING_LOGISTICS' && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm">
                                  <svg width="14" height="14" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7.86283 13.4584H9.10241V12.573C9.69269 12.4667 10.2003 12.2365 10.6253 11.8824C11.0503 11.5282 11.2628 11.0029 11.2628 10.3063C11.2628 9.8105 11.1212 9.35598 10.8378 8.94279C10.5545 8.5296 9.98783 8.16953 9.13783 7.86258C8.42949 7.62647 7.93956 7.41987 7.66803 7.24279C7.39651 7.06571 7.26074 6.82369 7.26074 6.51675C7.26074 6.2098 7.36994 5.96779 7.58835 5.79071C7.80675 5.61362 8.12255 5.52508 8.53574 5.52508C8.91352 5.52508 9.20866 5.61657 9.42116 5.79956C9.63366 5.98255 9.78713 6.2098 9.88158 6.48133L11.0149 6.02091C10.885 5.60772 10.646 5.24765 10.2977 4.94071C9.94946 4.63376 9.56283 4.46258 9.13783 4.42716V3.54175H7.89824V4.42716C7.30796 4.55703 6.84755 4.81675 6.51699 5.20633C6.18644 5.59591 6.02116 6.03272 6.02116 6.51675C6.02116 7.07161 6.18349 7.52022 6.50814 7.86258C6.83279 8.20494 7.34338 8.50008 8.03991 8.748C8.78366 9.01953 9.30015 9.26154 9.58939 9.47404C9.87862 9.68654 10.0232 9.96397 10.0232 10.3063C10.0232 10.6959 9.88453 10.9822 9.6071 11.1652C9.32967 11.3482 8.99616 11.4397 8.60658 11.4397C8.21699 11.4397 7.87168 11.3187 7.57064 11.0766C7.2696 10.8346 7.04824 10.4716 6.90658 9.98758L5.73783 10.448C5.9031 11.0147 6.15987 11.4721 6.50814 11.8204C6.8564 12.1687 7.30796 12.4077 7.86283 12.5376V13.4584ZM8.50033 15.5834C7.52046 15.5834 6.59963 15.3975 5.73783 15.0256C4.87602 14.6537 4.12637 14.149 3.48887 13.5115C2.85137 12.874 2.34668 12.1244 1.9748 11.2626C1.60293 10.4008 1.41699 9.47994 1.41699 8.50008C1.41699 7.52022 1.60293 6.59939 1.9748 5.73758C2.34668 4.87578 2.85137 4.12612 3.48887 3.48862C4.12637 2.85112 4.87602 2.34644 5.73783 1.97456C6.59963 1.60269 7.52046 1.41675 8.50033 1.41675C9.48019 1.41675 10.401 1.60269 11.2628 1.97456C12.1246 2.34644 12.8743 2.85112 13.5118 3.48862C14.1493 4.12612 14.654 4.87578 15.0258 5.73758C15.3977 6.59939 15.5837 7.52022 15.5837 8.50008C15.5837 9.47994 15.3977 10.4008 15.0258 11.2626C14.654 12.1244 14.1493 12.874 13.5118 13.5115C12.8743 14.149 12.1246 14.6537 11.2628 15.0256C10.401 15.3975 9.48019 15.5834 8.50033 15.5834ZM8.50033 14.1667C10.0823 14.1667 11.4222 13.6178 12.5201 12.5199C13.618 11.422 14.167 10.082 14.167 8.50008C14.167 6.91814 13.618 5.57821 12.5201 4.48029C11.4222 3.38237 10.0823 2.83341 8.50033 2.83341C6.91838 2.83341 5.57845 3.38237 4.48053 4.48029C3.38262 5.57821 2.83366 6.91814 2.83366 8.50008C2.83366 10.082 3.38262 11.422 4.48053 12.5199C5.57845 13.6178 6.91838 14.1667 8.50033 14.1667Z" fill="white"/>
                                  </svg>
                                  <p className="text-xs font-medium">{statusInfo[sale.status].text}</p>
                                </div>
                              )}
                              {sale.status === 'CONFIRMING_PAYMENT' && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm" style={{ backgroundColor: '#677200' }}>
                                  {sale.paid ? (
                                    <svg className="w-4 h-4" fill="none" stroke="white" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  ) : (
                                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M9.16699 14.1668H10.8337V13.3335H11.667C11.9031 13.3335 12.101 13.2536 12.2607 13.0939C12.4205 12.9342 12.5003 12.7363 12.5003 12.5002V10.0002C12.5003 9.76405 12.4205 9.56613 12.2607 9.40641C12.101 9.24669 11.9031 9.16683 11.667 9.16683H9.16699V8.3335H12.5003V6.66683H10.8337V5.8335H9.16699V6.66683H8.33366C8.09755 6.66683 7.89963 6.74669 7.73991 6.90641C7.58019 7.06613 7.50033 7.26405 7.50033 7.50016V10.0002C7.50033 10.2363 7.58019 10.4342 7.73991 10.5939C7.89963 10.7536 8.09755 10.8335 8.33366 10.8335H10.8337V11.6668H7.50033V13.3335H9.16699V14.1668ZM3.33366 16.6668C2.87533 16.6668 2.48296 16.5036 2.15658 16.1772C1.83019 15.8509 1.66699 15.4585 1.66699 15.0002V5.00016C1.66699 4.54183 1.83019 4.14947 2.15658 3.82308C2.48296 3.49669 2.87533 3.3335 3.33366 3.3335H16.667C17.1253 3.3335 17.5177 3.49669 17.8441 3.82308C18.1705 4.14947 18.3337 4.54183 18.3337 5.00016V15.0002C18.3337 15.4585 18.1705 15.8509 17.8441 16.1772C17.5177 16.5036 17.1253 16.6668 16.667 16.6668H3.33366ZM3.33366 15.0002H16.667V5.00016H3.33366V15.0002Z" fill="white"/>
                                    </svg>
                                  )}
                                  <p className="text-xs font-medium text-white">{sale.paid ? 'Payment Confirmed' : 'Confirming payment'}</p>
                                </div>
                              )}
                              {sale.status === 'IN_TRANSIT' && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                </svg>
                                  <p className="text-xs font-medium">{statusInfo[sale.status].text}</p>
                                </div>
                              )}
                              {sale.status === 'COMPLETED' && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                  <p className="text-xs font-medium">{statusInfo[sale.status].text}</p>
                                </div>
                              )}
                              {sale.status === 'CANCELED' && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-sm">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  <p className="text-xs font-medium">{statusInfo[sale.status].text}</p>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-600">on {new Date(sale.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          </div>

                          <div className="text-right ml-4">
                            <p className="text-sm text-gray-600 mb-1">Total</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {totalWhole}
                              <sup className="text-sm">{String(totalCents).padStart(2, '0')}</sup>
                              <span className="text-base font-normal ml-1">euro</span>
                            </p>
                          </div>
                        </div>

                        {/* Sale Items - Summary Only */}
                        <div className="space-y-2 mb-4">
                          {sale.soldItems.slice(0, 2).map((item) => (
                            <div key={item.id} className="flex items-center justify-between py-2">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                                <p className="text-xs text-gray-600">to {sale.buyerHospitalName}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-700">Qty: {item.quantity}</p>
                                <p className="text-xs text-gray-600">{(item.price * item.quantity).toFixed(2)} euro</p>
                              </div>
                            </div>
                          ))}
                          {sale.soldItems.length > 2 && (
                            <div className="py-2">
                              <p className="text-sm text-gray-600">+ {sale.soldItems.length - 2} more</p>
                            </div>
                          )}
                        </div>

                        {/* View Details Button */}
                        <div className="flex justify-end pt-4 border-t border-gray-300">
                          <button 
                            onClick={() => {
                              // Convert sale to order format for modal
                              const orderForModal: OrderResponse = {
                                id: sale.orderId,
                                hospitalId: sale.buyerHospitalId,
                                hospitalName: sale.buyerHospitalName,
                                deliveryAddress: {} as DeliveryAddressDto, // Not available in sales
                                items: sale.soldItems,
                                createdAt: sale.createdAt,
                                completedAt: sale.completedAt,
                                status: sale.status,
                                paid: sale.paid,
                                productsCost: sale.totalSalesAmount,
                                platformFee: 0,
                                deliveryFee: null,
                                totalCost: sale.totalSalesAmount
                              };
                              setSelectedOrder(orderForModal);
                              setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer"
                          >
                            View details
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Purchase History Tab Content */}
          {isOwner && activeTab === 'purchase' && (
            <>
              {isLoadingOrders ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading orders...</p>
                  </div>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No orders yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const pendingOrderCount = orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELED').length;
                    const isPending = order.status !== 'COMPLETED' && order.status !== 'CANCELED';
                    
                    const statusInfo: Record<OrderStatus, { color: string; text: string; icon?: string }> = {
                      'CALCULATING_LOGISTICS': { 
                        color: 'bg-blue-50 border-blue-200', 
                        text: 'Calculating logistics cost',
                        icon: 'blue'
                      },
                      'CONFIRMING_PAYMENT': { 
                        color: 'bg-yellow-50 border-yellow-200', 
                        text: 'Requires your action once completed',
                        icon: 'yellow'
                      },
                      'IN_TRANSIT': { 
                        color: 'bg-orange-50 border-orange-200', 
                        text: 'Order in transit',
                        icon: 'orange'
                      },
                      'COMPLETED': { 
                        color: 'bg-green-50 border-green-200', 
                        text: 'Order completed',
                        icon: 'green'
                      },
                      'CANCELED': { 
                        color: 'bg-gray-50 border-gray-200', 
                        text: 'Order canceled',
                        icon: 'gray'
                      }
                    };

                    const totalCost = order.totalCost || order.productsCost + order.platformFee;
                    const totalWhole = Math.floor(totalCost);
                    const totalCents = Math.round((totalCost - totalWhole) * 100);

                    return (
                      <div key={order.id} className={`border-2 rounded-2xl p-6`}>
                        {/* Order Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                {isPending && (
                                  <div className="w-3 h-3 rounded-full animate-pulse bg-orange-500"></div>
                                )}
                              <h3 className="text-base font-semibold text-gray-900">
                                {isPending ? 'Pending order' : `Transaction ID: ${order.id.substring(0, 13)}-...`}
                              </h3>
                            </div>
                              {/* Status Badge - Compact */}
                              {order.status === 'CALCULATING_LOGISTICS' && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm">
                                  <svg width="14" height="14" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7.86283 13.4584H9.10241V12.573C9.69269 12.4667 10.2003 12.2365 10.6253 11.8824C11.0503 11.5282 11.2628 11.0029 11.2628 10.3063C11.2628 9.8105 11.1212 9.35598 10.8378 8.94279C10.5545 8.5296 9.98783 8.16953 9.13783 7.86258C8.42949 7.62647 7.93956 7.41987 7.66803 7.24279C7.39651 7.06571 7.26074 6.82369 7.26074 6.51675C7.26074 6.2098 7.36994 5.96779 7.58835 5.79071C7.80675 5.61362 8.12255 5.52508 8.53574 5.52508C8.91352 5.52508 9.20866 5.61657 9.42116 5.79956C9.63366 5.98255 9.78713 6.2098 9.88158 6.48133L11.0149 6.02091C10.885 5.60772 10.646 5.24765 10.2977 4.94071C9.94946 4.63376 9.56283 4.46258 9.13783 4.42716V3.54175H7.89824V4.42716C7.30796 4.55703 6.84755 4.81675 6.51699 5.20633C6.18644 5.59591 6.02116 6.03272 6.02116 6.51675C6.02116 7.07161 6.18349 7.52022 6.50814 7.86258C6.83279 8.20494 7.34338 8.50008 8.03991 8.748C8.78366 9.01953 9.30015 9.26154 9.58939 9.47404C9.87862 9.68654 10.0232 9.96397 10.0232 10.3063C10.0232 10.6959 9.88453 10.9822 9.6071 11.1652C9.32967 11.3482 8.99616 11.4397 8.60658 11.4397C8.21699 11.4397 7.87168 11.3187 7.57064 11.0766C7.2696 10.8346 7.04824 10.4716 6.90658 9.98758L5.73783 10.448C5.9031 11.0147 6.15987 11.4721 6.50814 11.8204C6.8564 12.1687 7.30796 12.4077 7.86283 12.5376V13.4584ZM8.50033 15.5834C7.52046 15.5834 6.59963 15.3975 5.73783 15.0256C4.87602 14.6537 4.12637 14.149 3.48887 13.5115C2.85137 12.874 2.34668 12.1244 1.9748 11.2626C1.60293 10.4008 1.41699 9.47994 1.41699 8.50008C1.41699 7.52022 1.60293 6.59939 1.9748 5.73758C2.34668 4.87578 2.85137 4.12612 3.48887 3.48862C4.12637 2.85112 4.87602 2.34644 5.73783 1.97456C6.59963 1.60269 7.52046 1.41675 8.50033 1.41675C9.48019 1.41675 10.401 1.60269 11.2628 1.97456C12.1246 2.34644 12.8743 2.85112 13.5118 3.48862C14.1493 4.12612 14.654 4.87578 15.0258 5.73758C15.3977 6.59939 15.5837 7.52022 15.5837 8.50008C15.5837 9.47994 15.3977 10.4008 15.0258 11.2626C14.654 12.1244 14.1493 12.874 13.5118 13.5115C12.8743 14.149 12.1246 14.6537 11.2628 15.0256C10.401 15.3975 9.48019 15.5834 8.50033 15.5834ZM8.50033 14.1667C10.0823 14.1667 11.4222 13.6178 12.5201 12.5199C13.618 11.422 14.167 10.082 14.167 8.50008C14.167 6.91814 13.618 5.57821 12.5201 4.48029C11.4222 3.38237 10.0823 2.83341 8.50033 2.83341C6.91838 2.83341 5.57845 3.38237 4.48053 4.48029C3.38262 5.57821 2.83366 6.91814 2.83366 8.50008C2.83366 10.082 3.38262 11.422 4.48053 12.5199C5.57845 13.6178 6.91838 14.1667 8.50033 14.1667Z" fill="white"/>
                                  </svg>
                                  <p className="text-xs font-medium">{statusInfo[order.status].text}</p>
                                </div>
                              )}
                              {order.status === 'CONFIRMING_PAYMENT' && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm" style={{ backgroundColor: '#677200' }}>
                                  {order.paid ? (
                                    <svg className="w-4 h-4" fill="none" stroke="white" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  ) : (
                                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M9.16699 14.1668H10.8337V13.3335H11.667C11.9031 13.3335 12.101 13.2536 12.2607 13.0939C12.4205 12.9342 12.5003 12.7363 12.5003 12.5002V10.0002C12.5003 9.76405 12.4205 9.56613 12.2607 9.40641C12.101 9.24669 11.9031 9.16683 11.667 9.16683H9.16699V8.3335H12.5003V6.66683H10.8337V5.8335H9.16699V6.66683H8.33366C8.09755 6.66683 7.89963 6.74669 7.73991 6.90641C7.58019 7.06613 7.50033 7.26405 7.50033 7.50016V10.0002C7.50033 10.2363 7.58019 10.4342 7.73991 10.5939C7.89963 10.7536 8.09755 10.8335 8.33366 10.8335H10.8337V11.6668H7.50033V13.3335H9.16699V14.1668ZM3.33366 16.6668C2.87533 16.6668 2.48296 16.5036 2.15658 16.1772C1.83019 15.8509 1.66699 15.4585 1.66699 15.0002V5.00016C1.66699 4.54183 1.83019 4.14947 2.15658 3.82308C2.48296 3.49669 2.87533 3.3335 3.33366 3.3335H16.667C17.1253 3.3335 17.5177 3.49669 17.8441 3.82308C18.1705 4.14947 18.3337 4.54183 18.3337 5.00016V15.0002C18.3337 15.4585 18.1705 15.8509 17.8441 16.1772C17.5177 16.5036 17.1253 16.6668 16.667 16.6668H3.33366ZM3.33366 15.0002H16.667V5.00016H3.33366V15.0002Z" fill="white"/>
                                    </svg>
                                  )}
                                  <p className="text-xs font-medium text-white">{order.paid ? 'Payment Confirmed' : 'Confirming payment'}</p>
                                </div>
                              )}
                              {order.status === 'IN_TRANSIT' && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                </svg>
                                  <p className="text-xs font-medium">{statusInfo[order.status].text}</p>
                                </div>
                              )}
                              {order.status === 'COMPLETED' && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                  <p className="text-xs font-medium">{statusInfo[order.status].text}</p>
                                </div>
                              )}
                              {order.status === 'CANCELED' && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-sm">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  <p className="text-xs font-medium">{statusInfo[order.status].text}</p>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-600">on {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          </div>

                          <div className="text-right ml-4">
                            <p className="text-sm text-gray-600 mb-1">Total</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {totalWhole}
                              <sup className="text-sm">{String(totalCents).padStart(2, '0')}</sup>
                              <span className="text-base font-normal ml-1">euro</span>
                            </p>
                          </div>
                        </div>

                        {/* Payment Required Message */}
                        {order.status === 'CONFIRMING_PAYMENT' && !order.paid && (
                          <div className="mb-4 p-4 rounded-lg border-2" style={{ backgroundColor: 'rgba(103, 114, 0, 0.1)', borderColor: '#677200' }}>
                            <div className="flex items-start gap-3">
                              <svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mt-0.5">
                                <path d="M0.625 13.125L7.5 1.25L14.375 13.125H0.625ZM2.78125 11.875H12.2188L7.5 3.75L2.78125 11.875ZM7.5 11.25C7.67708 11.25 7.82552 11.1901 7.94531 11.0703C8.0651 10.9505 8.125 10.8021 8.125 10.625C8.125 10.4479 8.0651 10.2995 7.94531 10.1797C7.82552 10.0599 7.67708 10 7.5 10C7.32292 10 7.17448 10.0599 7.05469 10.1797C6.9349 10.2995 6.875 10.4479 6.875 10.625C6.875 10.8021 6.9349 10.9505 7.05469 11.0703C7.17448 11.1901 7.32292 11.25 7.5 11.25ZM6.875 9.375H8.125V6.25H6.875V9.375Z" fill="#677200"/>
                              </svg>
                              <div className="flex-1">
                                <p className="text-sm font-semibold mb-1" style={{ color: '#677200' }}>Payment Required</p>
                                <p className="text-xs" style={{ color: '#556100' }}>Your order is ready. Please complete the payment to proceed with delivery.</p>
                                </div>
                                </div>
                                </div>
                        )}

                        {/* Order Items - Summary Only */}
                        <div className="space-y-2 mb-4">
                          {order.items.slice(0, 2).map((item) => (
                            <div key={item.id} className="flex items-center justify-between py-2">
                                <div>
                                <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                                <p className="text-xs text-gray-600">by {item.product.sellerHospitalName}</p>
                                </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-700">Qty: {item.quantity}</p>
                                <p className="text-xs text-gray-600">{(item.price * item.quantity).toFixed(2)} euro</p>
                              </div>
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <div className="py-2">
                              <p className="text-sm text-gray-600">+ {order.items.length - 2} more</p>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-300">
                          {order.status === 'CONFIRMING_PAYMENT' && !order.paid && (
                            <button 
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsPaymentModalOpen(true);
                              }}
                              className="flex items-center gap-2 px-6 py-2 text-white rounded-full text-sm font-medium transition-colors cursor-pointer"
                              style={{ backgroundColor: '#677200' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#556100'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#677200'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              Make Payment
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer"
                          >
                            View details
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Order Details Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedOrder(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Fixed Header Section */}
              <div className="px-6 pt-6 flex-shrink-0">
                {/* Order Header Info */}
                <div className="mb-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Transaction ID: {selectedOrder.id}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Created on {new Date(selectedOrder.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">Total Cost</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {Math.floor(selectedOrder.totalCost || selectedOrder.productsCost + selectedOrder.platformFee)}
                        <sup className="text-lg">
                          {String(Math.round(((selectedOrder.totalCost || selectedOrder.productsCost + selectedOrder.platformFee) - Math.floor(selectedOrder.totalCost || selectedOrder.productsCost + selectedOrder.platformFee)) * 100)).padStart(2, '0')}
                        </sup>
                        <span className="text-lg font-normal ml-1">euro</span>
                      </p>
                    </div>
                  </div>

                {/* Status Badge */}
                <div className="flex items-center gap-3 flex-wrap">
                  {selectedOrder.status === 'CALCULATING_LOGISTICS' && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md">
                      <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.86283 13.4584H9.10241V12.573C9.69269 12.4667 10.2003 12.2365 10.6253 11.8824C11.0503 11.5282 11.2628 11.0029 11.2628 10.3063C11.2628 9.8105 11.1212 9.35598 10.8378 8.94279C10.5545 8.5296 9.98783 8.16953 9.13783 7.86258C8.42949 7.62647 7.93956 7.41987 7.66803 7.24279C7.39651 7.06571 7.26074 6.82369 7.26074 6.51675C7.26074 6.2098 7.36994 5.96779 7.58835 5.79071C7.80675 5.61362 8.12255 5.52508 8.53574 5.52508C8.91352 5.52508 9.20866 5.61657 9.42116 5.79956C9.63366 5.98255 9.78713 6.2098 9.88158 6.48133L11.0149 6.02091C10.885 5.60772 10.646 5.24765 10.2977 4.94071C9.94946 4.63376 9.56283 4.46258 9.13783 4.42716V3.54175H7.89824V4.42716C7.30796 4.55703 6.84755 4.81675 6.51699 5.20633C6.18644 5.59591 6.02116 6.03272 6.02116 6.51675C6.02116 7.07161 6.18349 7.52022 6.50814 7.86258C6.83279 8.20494 7.34338 8.50008 8.03991 8.748C8.78366 9.01953 9.30015 9.26154 9.58939 9.47404C9.87862 9.68654 10.0232 9.96397 10.0232 10.3063C10.0232 10.6959 9.88453 10.9822 9.6071 11.1652C9.32967 11.3482 8.99616 11.4397 8.60658 11.4397C8.21699 11.4397 7.87168 11.3187 7.57064 11.0766C7.2696 10.8346 7.04824 10.4716 6.90658 9.98758L5.73783 10.448C5.9031 11.0147 6.15987 11.4721 6.50814 11.8204C6.8564 12.1687 7.30796 12.4077 7.86283 12.5376V13.4584ZM8.50033 15.5834C7.52046 15.5834 6.59963 15.3975 5.73783 15.0256C4.87602 14.6537 4.12637 14.149 3.48887 13.5115C2.85137 12.874 2.34668 12.1244 1.9748 11.2626C1.60293 10.4008 1.41699 9.47994 1.41699 8.50008C1.41699 7.52022 1.60293 6.59939 1.9748 5.73758C2.34668 4.87578 2.85137 4.12612 3.48887 3.48862C4.12637 2.85112 4.87602 2.34644 5.73783 1.97456C6.59963 1.60269 7.52046 1.41675 8.50033 1.41675C9.48019 1.41675 10.401 1.60269 11.2628 1.97456C12.1246 2.34644 12.8743 2.85112 13.5118 3.48862C14.1493 4.12612 14.654 4.87578 15.0258 5.73758C15.3977 6.59939 15.5837 7.52022 15.5837 8.50008C15.5837 9.47994 15.3977 10.4008 15.0258 11.2626C14.654 12.1244 14.1493 12.874 13.5118 13.5115C12.8743 14.149 12.1246 14.6537 11.2628 15.0256C10.401 15.3975 9.48019 15.5834 8.50033 15.5834ZM8.50033 14.1667C10.0823 14.1667 11.4222 13.6178 12.5201 12.5199C13.618 11.422 14.167 10.082 14.167 8.50008C14.167 6.91814 13.618 5.57821 12.5201 4.48029C11.4222 3.38237 10.0823 2.83341 8.50033 2.83341C6.91838 2.83341 5.57845 3.38237 4.48053 4.48029C3.38262 5.57821 2.83366 6.91814 2.83366 8.50008C2.83366 10.082 3.38262 11.422 4.48053 12.5199C5.57845 13.6178 6.91838 14.1667 8.50033 14.1667Z" fill="white"/>
                      </svg>
                      <p className="text-sm font-semibold">Calculating logistics cost</p>
                    </div>
                  )}
                  {selectedOrder.status === 'CONFIRMING_PAYMENT' && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full shadow-md" style={{ backgroundColor: '#677200' }}>
                      {selectedOrder.paid ? (
                        <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9.16699 14.1668H10.8337V13.3335H11.667C11.9031 13.3335 12.101 13.2536 12.2607 13.0939C12.4205 12.9342 12.5003 12.7363 12.5003 12.5002V10.0002C12.5003 9.76405 12.4205 9.56613 12.2607 9.40641C12.101 9.24669 11.9031 9.16683 11.667 9.16683H9.16699V8.3335H12.5003V6.66683H10.8337V5.8335H9.16699V6.66683H8.33366C8.09755 6.66683 7.89963 6.74669 7.73991 6.90641C7.58019 7.06613 7.50033 7.26405 7.50033 7.50016V10.0002C7.50033 10.2363 7.58019 10.4342 7.73991 10.5939C7.89963 10.7536 8.09755 10.8335 8.33366 10.8335H10.8337V11.6668H7.50033V13.3335H9.16699V14.1668ZM3.33366 16.6668C2.87533 16.6668 2.48296 16.5036 2.15658 16.1772C1.83019 15.8509 1.66699 15.4585 1.66699 15.0002V5.00016C1.66699 4.54183 1.83019 4.14947 2.15658 3.82308C2.48296 3.49669 2.87533 3.3335 3.33366 3.3335H16.667C17.1253 3.3335 17.5177 3.49669 17.8441 3.82308C18.1705 4.14947 18.3337 4.54183 18.3337 5.00016V15.0002C18.3337 15.4585 18.1705 15.8509 17.8441 16.1772C17.5177 16.5036 17.1253 16.6668 16.667 16.6668H3.33366ZM3.33366 15.0002H16.667V5.00016H3.33366V15.0002Z" fill="white"/>
                        </svg>
                      )}
                      <p className="text-sm font-semibold text-white">{selectedOrder.paid ? 'Payment Confirmed' : 'Confirming payment'}</p>
                    </div>
                  )}
                  {selectedOrder.status === 'IN_TRANSIT' && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                      </svg>
                      <p className="text-sm font-semibold">Order in transit</p>
                    </div>
                  )}
                  {selectedOrder.status === 'COMPLETED' && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-semibold">Order completed</p>
                    </div>
                  )}
                  {selectedOrder.status === 'CANCELED' && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <p className="text-sm font-semibold">Order canceled</p>
                    </div>
                  )}
                </div>
                </div>

                {/* Delivery Address - Only show if available */}
                {selectedOrder.deliveryAddress && selectedOrder.deliveryAddress.streetAddress && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Delivery Address</h4>
                    <p className="text-sm text-gray-700">
                      {selectedOrder.deliveryAddress.streetAddress}<br />
                      {selectedOrder.deliveryAddress.city}, {selectedOrder.deliveryAddress.state} {selectedOrder.deliveryAddress.postalCode}<br />
                      {selectedOrder.deliveryAddress.country}
                    </p>
                  </div>
                )}
              </div>

              {/* Scrollable Products Section */}
              <div className="px-6 overflow-y-auto flex-1">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Products</h4>
                <div className="space-y-4 pb-4">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <p className="text-base font-semibold text-gray-900 mb-1">{item.product.name}</p>
                      <p className="text-sm text-gray-600 mb-3">by {item.product.sellerHospitalName}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 mb-1">Type</p>
                          <p className="text-gray-900 font-medium">{item.product.unit}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Quantity</p>
                          <p className="text-gray-900 font-medium">{item.quantity}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Expiry date</p>
                          <p className="text-gray-900 font-medium">
                            {new Date(item.product.expiryDate).toLocaleDateString('en-GB', { month: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Product code</p>
                          <p className="text-gray-900 font-medium">{item.product.code}</p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-600">Price per unit</p>
                          <p className="text-base font-semibold text-gray-900">{item.price.toFixed(2)} euro</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fixed Cost Breakdown Section */}
              <div className="px-6 pb-6 border-t border-gray-200 pt-4 flex-shrink-0">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Cost Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <p className="text-gray-600">Products cost</p>
                    <p className="text-gray-900 font-medium">{selectedOrder.productsCost.toFixed(2)} euro</p>
                  </div>
                  {selectedOrder.platformFee > 0 && (
                    <div className="flex justify-between">
                      <p className="text-gray-600">Platform fee</p>
                      <p className="text-gray-900 font-medium">{selectedOrder.platformFee.toFixed(2)} euro</p>
                    </div>
                  )}
                  {selectedOrder.deliveryAddress && selectedOrder.deliveryAddress.streetAddress && (
                    <div className="flex justify-between">
                      <p className="text-gray-600">Delivery cost</p>
                      {selectedOrder.deliveryFee !== null ? (
                        <p className="text-gray-900 font-medium">{selectedOrder.deliveryFee.toFixed(2)} euro</p>
                      ) : (
                        <p className="text-gray-500 italic">Calculating...</p>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <p className="text-gray-900 font-semibold">Total</p>
                    <p className="text-lg font-bold text-gray-900">
                      {(selectedOrder.totalCost || selectedOrder.productsCost + selectedOrder.platformFee).toFixed(2)} euro
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end flex-shrink-0">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedOrder(null);
                }}
                className="px-6 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <div>
                  <h2 className="text-xl font-bold text-white">Complete Payment</h2>
                  <p className="text-sm text-green-100">Order #{selectedOrder.id.substring(0, 8)}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setSelectedOrder(null);
                }}
                className="p-2 hover:bg-green-800 rounded-full transition-colors cursor-pointer"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Payment Amount */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Total Amount Due</p>
                <p className="text-3xl font-bold text-gray-900">
                  {Math.floor(selectedOrder.totalCost || selectedOrder.productsCost + selectedOrder.platformFee)}
                  <sup className="text-xl">
                    {String(Math.round(((selectedOrder.totalCost || selectedOrder.productsCost + selectedOrder.platformFee) - Math.floor(selectedOrder.totalCost || selectedOrder.productsCost + selectedOrder.platformFee)) * 100)).padStart(2, '0')}
                  </sup>
                  <span className="text-xl font-normal ml-1">euro</span>
                </p>
              </div>

              {/* Instructions */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Instructions</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Please make a bank transfer to the following account. Make sure to include your order ID in the payment reference.
                </p>
              </div>

              {/* Bank Details */}
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Bank Name</p>
                      <p className="text-sm font-semibold text-gray-900">Kelox Bank</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Account Holder</p>
                      <p className="text-sm font-semibold text-gray-900">Kelox Platform Ltd</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">IBAN</p>
                      <p className="text-sm font-mono font-semibold text-gray-900">DE89 3704 0044 0532 0130 00</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">BIC/SWIFT</p>
                      <p className="text-sm font-mono font-semibold text-gray-900">COBADEFFXXX</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-600 mb-1">Payment Reference (Required)</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono font-semibold text-blue-600 bg-blue-100 px-3 py-1 rounded">
                          {selectedOrder.id}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Important Notice */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-yellow-800 mb-1">Important</p>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      <li>• Please include the payment reference in your transfer</li>
                      <li>• Payment processing may take 1-3 business days</li>
                      <li>• Your order will be shipped once payment is confirmed</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setSelectedOrder(null);
                }}
                className="px-6 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      <CsvImportModal 
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={() => {
          setIsCsvModalOpen(false);
          // Refresh products list
          const fetchProducts = async () => {
            if (!hospital?.id) return;
            try {
              setIsLoadingProducts(true);
              const response = await fetch(`${BACKEND_API}/api/marketplace/hospitals/${hospital.id}/products`);
              if (response.ok) {
                const data = await response.json();
                setProducts(data);
              }
            } catch (error) {
              console.error('Error fetching products:', error);
            } finally {
              setIsLoadingProducts(false);
            }
          };
          fetchProducts();
        }}
      />
    </div>
  );
}

// CSV Import Modal Component
interface CsvProduct {
  name: string;
  manufacturer: string;
  code: string;
  lotNumber: string;
  expiryDate: string;
  description?: string;
  price: number;
  quantity: number;
  unit: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CsvImportModal({ isOpen, onClose, onSuccess }: CsvImportModalProps) {
  const [step, setStep] = useState<'instructions' | 'preview'>('instructions');
  const [csvData, setCsvData] = useState<CsvProduct[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useState<HTMLInputElement | null>(null)[0];

  const resetModal = () => {
    setStep('instructions');
    setCsvData([]);
    setValidationErrors([]);
    setIsUploading(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  // Parse date in multiple formats: dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
  const parseDate = (dateStr: string): string | null => {
    if (!dateStr || dateStr.trim() === '') return null;
    
    // Replace all separators with /
    const normalized = dateStr.trim().replace(/[-\.]/g, '/');
    const parts = normalized.split('/');
    
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    // Validate ranges
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31) return null;
    if (month < 1 || month > 12) return null;
    if (year < 1900 || year > 2100) return null;
    
    // Convert to ISO format (yyyy-mm-dd)
    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Validate it's a real date
    const testDate = new Date(isoDate);
    if (isNaN(testDate.getTime())) return null;
    
    return isoDate;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCsvData(text);
    };
    reader.readAsText(file);
  };

  // Helper function to parse CSV line respecting quotes
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Push the last field
    result.push(current.trim());
    
    return result;
  };

  const parseCsvData = (csvText: string) => {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) {
      alert('CSV file is empty or invalid');
      return;
    }

    // Parse header
    const header = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
    
    // Validate required columns
    const requiredColumns = ['name', 'manufacturer', 'code', 'lotnumber', 'expirydate', 'price', 'quantity', 'unit'];
    const missingColumns = requiredColumns.filter(col => !header.includes(col));
    
    if (missingColumns.length > 0) {
      alert(`Missing required columns: ${missingColumns.join(', ')}\n\nPlease ensure your CSV has all required columns.`);
      return;
    }

    const products: CsvProduct[] = [];
    const errors: ValidationError[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      const row: any = {};
      
      header.forEach((col, idx) => {
        row[col] = values[idx] || '';
      });

      const rowNumber = i + 1;

      // Validate and parse each field
      const product: any = {};
      
      // Name (required)
      if (!row.name || row.name === '') {
        errors.push({ row: rowNumber, field: 'name', message: 'Name is required' });
      } else {
        product.name = row.name;
      }

      // Manufacturer (required)
      if (!row.manufacturer || row.manufacturer === '') {
        errors.push({ row: rowNumber, field: 'manufacturer', message: 'Manufacturer is required' });
      } else {
        product.manufacturer = row.manufacturer;
      }

      // Code (required)
      if (!row.code || row.code === '') {
        errors.push({ row: rowNumber, field: 'code', message: 'Code is required' });
      } else {
        product.code = row.code;
      }

      // Lot Number (required)
      if (!row.lotnumber || row.lotnumber === '') {
        errors.push({ row: rowNumber, field: 'lotNumber', message: 'Lot number is required' });
      } else {
        product.lotNumber = row.lotnumber;
      }

      // Expiry Date (required, format: dd/mm/yyyy)
      if (!row.expirydate || row.expirydate === '') {
        errors.push({ row: rowNumber, field: 'expiryDate', message: 'Expiry date is required' });
      } else {
        const parsedDate = parseDate(row.expirydate);
        if (!parsedDate) {
          errors.push({ row: rowNumber, field: 'expiryDate', message: 'Invalid date format. Use dd/mm/yyyy, dd-mm-yyyy, or dd.mm.yyyy' });
        } else {
          product.expiryDate = parsedDate;
        }
      }

      // Description (optional)
      product.description = row.description || '';

      // Price (required, must be a positive number)
      if (!row.price || row.price === '') {
        errors.push({ row: rowNumber, field: 'price', message: 'Price is required' });
      } else {
        const price = parseFloat(row.price);
        if (isNaN(price) || price <= 0) {
          errors.push({ row: rowNumber, field: 'price', message: 'Price must be a positive number' });
        } else {
          product.price = price;
        }
      }

      // Quantity (required, must be a positive integer)
      if (!row.quantity || row.quantity === '') {
        errors.push({ row: rowNumber, field: 'quantity', message: 'Quantity is required' });
      } else {
        const quantity = parseInt(row.quantity, 10);
        if (isNaN(quantity) || quantity <= 0) {
          errors.push({ row: rowNumber, field: 'quantity', message: 'Quantity must be a positive integer' });
        } else {
          product.quantity = quantity;
        }
      }

      // Unit (required, must be BOX or PIECE)
      if (!row.unit || row.unit === '') {
        errors.push({ row: rowNumber, field: 'unit', message: 'Unit is required' });
      } else {
        const unitUpper = row.unit.toUpperCase();
        if (unitUpper !== 'BOX' && unitUpper !== 'PIECE') {
          errors.push({ row: rowNumber, field: 'unit', message: 'Unit must be either BOX or PIECE' });
        } else {
          product.unit = unitUpper;
        }
      }

      products.push(product as CsvProduct);
    }

    setCsvData(products);
    setValidationErrors(errors);
    setStep('preview');
  };

  const handleConfirmUpload = async () => {
    if (validationErrors.length > 0) {
      alert('Please fix all validation errors before uploading');
      return;
    }

    setIsUploading(true);

    try {
      // Format dates to LocalDateTime format (yyyy-MM-ddTHH:mm:ss) for Java backend
      const productsForBackend = csvData.map(product => ({
        ...product,
        expiryDate: product.expiryDate ? `${product.expiryDate}T00:00:00` : product.expiryDate
      }));

      const response = await authenticatedFetch('/api/hospitals/my-products', {
        method: 'POST',
        body: JSON.stringify({ products: productsForBackend })
      });

      if (response.ok) {
        alert('Products imported successfully!');
        onSuccess();
        handleClose();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to import products');
      }
    } catch (error) {
      console.error('Error uploading products:', error);
      alert(error instanceof Error ? error.message : 'Failed to import products. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900">Import Products from CSV</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-300 hover:text-gray-800 cursor-pointer transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {step === 'instructions' ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">CSV Format Instructions</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your CSV file must include the following columns in this exact order:
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Required Columns:</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <span className="font-mono bg-white px-2 py-1 rounded border border-blue-300 text-blue-900 font-semibold">name</span>
                    <span className="text-gray-700">Product name</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-mono bg-white px-2 py-1 rounded border border-blue-300 text-blue-900 font-semibold">manufacturer</span>
                    <span className="text-gray-700">Manufacturer name</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-mono bg-white px-2 py-1 rounded border border-blue-300 text-blue-900 font-semibold">code</span>
                    <span className="text-gray-700">Product code</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-mono bg-white px-2 py-1 rounded border border-blue-300 text-blue-900 font-semibold">lotNumber</span>
                    <span className="text-gray-700">Lot number</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-mono bg-white px-2 py-1 rounded border border-blue-300 text-blue-900 font-semibold">expiryDate</span>
                    <span className="text-gray-700">
                      Expiry date in format <strong>dd/mm/yyyy</strong> (also accepts dd-mm-yyyy or dd.mm.yyyy)
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-mono bg-white px-2 py-1 rounded border border-blue-300 text-blue-900 font-semibold">description</span>
                    <span className="text-gray-700">Product description (optional)</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-mono bg-white px-2 py-1 rounded border border-blue-300 text-blue-900 font-semibold">price</span>
                    <span className="text-gray-700">Price per unit (number)</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-mono bg-white px-2 py-1 rounded border border-blue-300 text-blue-900 font-semibold">quantity</span>
                    <span className="text-gray-700">Quantity available (integer)</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-mono bg-white px-2 py-1 rounded border border-blue-300 text-blue-900 font-semibold">unit</span>
                    <span className="text-gray-700">Unit of measurement - <strong>must be either BOX or PIECE</strong></span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-yellow-800 mb-1">Important Notes:</p>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      <li>• Date format must be dd/mm/yyyy (day/month/year). You can also use - or . as separators</li>
                      <li>• All fields are required except description</li>
                      <li>• <strong>Unit must be either BOX or PIECE</strong> (other values will be rejected)</li>
                      <li>• Column names must match exactly (case-insensitive)</li>
                      <li>• If a product with the same code and lot number exists, the quantity will be added</li>
                      <li>• If a product has the same code but different lot number, a new product will be created</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview & Validation</h3>
                <p className="text-sm text-gray-600">
                  {validationErrors.length === 0 ? (
                    <span className="text-green-600 font-medium">✓ All products are valid and ready to import</span>
                  ) : (
                    <span className="text-red-600 font-medium">⚠ {validationErrors.length} validation error(s) found. Please fix and re-upload.</span>
                  )}
                </p>
              </div>

              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                  <h4 className="text-sm font-semibold text-red-900 mb-3">Validation Errors:</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {validationErrors.map((error, idx) => (
                      <div key={idx} className="text-sm text-red-700 flex items-start gap-2">
                        <span className="font-semibold">Row {error.row}:</span>
                        <span>{error.field} - {error.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Products to Import ({csvData.length}):</h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {csvData.map((product, idx) => {
                    const rowErrors = validationErrors.filter(e => e.row === idx + 2);
                    const hasErrors = rowErrors.length > 0;
                    
                    return (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-lg border-2 ${hasErrors ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}
                      >
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Name</p>
                            <p className="font-medium text-gray-900">{product.name || '—'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Manufacturer</p>
                            <p className="font-medium text-gray-900">{product.manufacturer || '—'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Code</p>
                            <p className="font-medium text-gray-900">{product.code || '—'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Lot Number</p>
                            <p className="font-medium text-gray-900">{product.lotNumber || '—'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Expiry Date</p>
                            <p className="font-medium text-gray-900">{product.expiryDate || '—'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Price</p>
                            <p className="font-medium text-gray-900">{product.price ? `€${product.price}` : '—'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Quantity</p>
                            <p className="font-medium text-gray-900">{product.quantity || '—'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Unit</p>
                            <p className="font-medium text-gray-900">{product.unit || '—'}</p>
                          </div>
                        </div>
                        {product.description && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-gray-500 text-xs mb-1">Description</p>
                            <p className="text-sm text-gray-700">{product.description}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-8 py-6 flex justify-between items-center gap-3 flex-shrink-0">
          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('instructions')}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-900 rounded-full text-base font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={validationErrors.length > 0 || isUploading}
                className="px-6 py-3 bg-black text-white rounded-full text-base font-medium hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Importing...' : `Import ${csvData.length} Products`}
              </button>
            </>
          )}
          {step === 'instructions' && (
            <>
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-900 rounded-full text-base font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <div className="flex-1 max-w-md">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="block w-full py-3 bg-black text-white text-center rounded-full text-base font-medium hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Upload CSV File
                </label>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

