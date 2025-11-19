'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { authenticatedFetch, BACKEND_API } from '@/lib/api';
import NavBar from '@/app/components/NavBar';
import OfferModal from '@/app/components/OfferModal';

interface ProductDetails {
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

interface OfferResponse {
  id: string;
  hospitalId: number;
  hospitalName: string;
  creatorId: string;
  creatorEmail: string;
  products: {
    productId: number;
    quantity: number;
    price: number;
    productName: string;
    productCode: string;
  }[];
  createdAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export default function ProductPage() {
  const router = useRouter();
  const params = useParams();
  const { jwtToken, hospitalProfile, fetchShoppingCart } = useUser();
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyQuantity, setBuyQuantity] = useState<number>(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [pendingOffer, setPendingOffer] = useState<OfferResponse | null>(null);
  const [isLoadingOffer, setIsLoadingOffer] = useState(false);
  
  // Check if the logged-in user owns the hospital that listed this product
  const isOwnProduct = hospitalProfile?.name === product?.sellerHospitalName;

  useEffect(() => {
    const fetchProduct = async () => {
      if (!params.productId) return;

      try {
        setIsLoading(true);
        const response = await authenticatedFetch(`/api/marketplace/products/${params.productId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch product');
        }

        const data = await response.json();
        setProduct(data);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [params.productId]);

  // Check for pending offer
  useEffect(() => {
    const checkPendingOffer = async () => {
      if (!product || !jwtToken || isOwnProduct) return;

      try {
        setIsLoadingOffer(true);
        const response = await authenticatedFetch(`/api/offers/check-pending/hospitals/${product.sellerHospitalId}`);
        
        if (response.ok) {
          const data = await response.json();
          setPendingOffer(data);
        } else if (response.status === 404) {
          // No pending offer found
          setPendingOffer(null);
        }
      } catch (error) {
        console.error('Error checking pending offer:', error);
      } finally {
        setIsLoadingOffer(false);
      }
    };

    checkPendingOffer();
  }, [product, jwtToken, isOwnProduct]);

  const handleMakeOffer = () => {
    setShowOfferModal(true);
  };

  const handleOfferSuccess = async () => {
    // Refresh pending offer after successful submission
    if (!product) return;
    
    try {
      const response = await authenticatedFetch(`/api/offers/check-pending/hospitals/${product.sellerHospitalId}`);
      if (response.ok) {
        const data = await response.json();
        setPendingOffer(data);
      } else if (response.status === 404) {
        setPendingOffer(null);
      }
    } catch (error) {
      console.error('Error refreshing pending offer:', error);
    }
  };

  const handleCancelOffer = async () => {
    if (!pendingOffer) return;

    if (!confirm('Are you sure you want to cancel this offer?')) return;

    try {
      const response = await authenticatedFetch(`/api/offers/${pendingOffer.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const updatedOffer = await response.json();
        alert('Offer cancelled successfully');
        
        // Update pending offer to show CANCELED status
        setPendingOffer(updatedOffer);
        
        // After a brief delay, remove the offer from view
        setTimeout(() => {
          setPendingOffer(null);
        }, 1000);
      } else {
        throw new Error('Failed to cancel offer');
      }
    } catch (error) {
      console.error('Error cancelling offer:', error);
      alert('Failed to cancel offer. Please try again.');
    }
  };

  const handleBuyNow = () => {
    setBuyQuantity(1);
    setShowBuyModal(true);
  };

  const handleAddToCart = async () => {
    if (!product) return;

    if (buyQuantity < 1 || buyQuantity > product.quantity) {
      alert(`Please enter a valid quantity (1-${product.quantity})`);
      return;
    }

    try {
      setIsAddingToCart(true);
      
      const addToCartData = {
        productId: Number(product.id),
        quantity: buyQuantity
      };

      const response = await authenticatedFetch('/api/shop/cart/add', {
        method: 'POST',
        body: JSON.stringify(addToCartData)
      });

      if (response.ok) {
        alert('Product added to cart successfully!');
        setShowBuyModal(false);
        setBuyQuantity(1);
        // Refresh shopping cart
        await fetchShoppingCart();
      } else {
        throw new Error('Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add product to cart. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const calculateOfferTotal = (offer: OfferResponse) => {
    return offer.products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  };

  const formatExpiryDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = date.toLocaleString('en-US', { month: 'short' });
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return dateString;
    }
  };

  const formatPrice = (price: number) => {
    const whole = Math.floor(price);
    const cents = Math.round((price - whole) * 100);
    return { whole, cents };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <p className="text-center text-gray-600">Product not found</p>
        </div>
      </div>
    );
  }

  const { whole, cents } = formatPrice(product.price);

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Product Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Name and Seller */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <div className="flex items-center gap-2 text-gray-600">
                <span>by </span>
                <button
                  onClick={() => {
                    const formattedName = product.sellerHospitalName.replace(/\s+/g, '-');
                    router.push(`/hospital/${formattedName}`);
                  }}
                  className="text-gray-900 hover:underline cursor-pointer font-medium"
                >
                  {product.sellerHospitalName}
                </button>
                <svg 
                    className="w-5 h-5 text-blue-500" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                    />
                  </svg>
              </div>
            </div>

            {/* Product Code */}
            {product.code && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Product code: {product.code}</p>
              </div>
            )}

            {/* Manufacturer */}
            {product.manufacturer && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Manufacturer</p>
                <p className="text-base text-gray-900">{product.manufacturer}</p>
              </div>
            )}

            {/* Brand Name */}
            {product.brandName && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Brand name</p>
                <p className="text-base text-gray-900">{product.brandName}</p>
              </div>
            )}

            {/* Lot Number */}
            {product.lotNumber && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Lot number</p>
                <p className="text-base text-gray-900">{product.lotNumber}</p>
              </div>
            )}

            {/* Expiry Date */}
            <div>
              <p className="text-xs text-gray-500 mb-1">Expiry date</p>
              <p className="text-base text-gray-900">{formatExpiryDate(product.expiryDate)}</p>
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">Description</p>
                <div className="text-sm text-gray-700 leading-relaxed">
                  <p className={showFullDescription ? '' : 'line-clamp-3'}>
                    {product.description}
                  </p>
                  {product.description.length > 150 && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="mt-3 px-6 py-2 bg-secondary rounded-lg text-sm font-medium text-gray-700 hover:bg-secondary-2 transition-colors cursor-pointer"
                    >
                      {showFullDescription ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Purchase Details */}
          <div className="lg:col-span-1">
            <div className="bg-primary rounded-2xl p-6 space-y-6 sticky top-6">
              {/* Quantity */}
              <div>
                <p className="text-sm text-gray-600 mb-1">Quantity</p>
                <p className="text-2xl font-semibold text-gray-900">{product.quantity}</p>
              </div>

              {/* Unit */}
              <div>
                <p className="text-sm text-gray-600 mb-1">Unit</p>
                <p className="text-lg text-gray-900">{product.unit}</p>
              </div>

              {/* Price */}
              <div className="pt-4 border-t border-gray-300">
                <p className="text-sm text-gray-600 mb-1">Price</p>
                <p className="text-2xl font-semibold text-gray-900 mb-6">
                  {product.price.toFixed(2)} {product.currency || 'euro'} / {product.unit}
                </p>

                {/* Action Buttons - Only show if user doesn't own this product and has no pending offer */}
                {!isOwnProduct && !pendingOffer && (
                  <div className="space-y-3">
                    <button 
                      onClick={handleBuyNow}
                      className="w-full bg-black text-white py-3 rounded-full text-base font-medium hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      Buy now
                    </button>
                    <button 
                      onClick={handleMakeOffer}
                      className="w-full bg-secondary text-gray-900 py-3 rounded-full text-base font-medium hover:bg-secondary-2 transition-colors cursor-pointer"
                    >
                      Make offer
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* My Offer Section - Show if pending offer exists */}
            {!isOwnProduct && pendingOffer && (
              <div className="mt-6 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">My Offer</h3>
                </div>

                {/* Offer Card */}
                <div className="bg-primary rounded-xl p-4 mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        pendingOffer.status === 'PENDING' 
                          ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' 
                          : pendingOffer.status === 'REJECTED'
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : 'bg-green-100 text-green-700 border border-green-300'
                      }`}>
                        {pendingOffer.status === 'PENDING' ? 'Pending' : pendingOffer.status === 'REJECTED' ? 'Rejected' : 'Accepted'}
                      </span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">
                      {calculateOfferTotal(pendingOffer).toFixed(2)} euro
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{getTimeAgo(pendingOffer.createdAt)}</p>
                </div>

                {/* Actions */}
                <button
                  onClick={() => router.push('/my-offers')}
                  className="w-full bg-black text-white py-3 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  View my offers
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Offer Modal */}
      {product && (
        <OfferModal
          isOpen={showOfferModal}
          onClose={() => setShowOfferModal(false)}
          initialProduct={product}
          existingOffer={pendingOffer}
          hospitalId={product.sellerHospitalId}
          hospitalName={product.sellerHospitalName}
          onSuccess={handleOfferSuccess}
        />
      )}

      {/* Buy Now Modal */}
      {showBuyModal && product && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full">
            <div className="p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Add to Cart</h2>
                  <p className="text-sm text-gray-600">{product.name}</p>
                </div>
                <button
                  onClick={() => {
                    setShowBuyModal(false);
                    setBuyQuantity(1);
                  }}
                  className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-300 hover:text-gray-800 cursor-pointer transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Product Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Price per unit:</span>
                  <span className="text-sm font-medium text-gray-900">{product.price.toFixed(2)} euro</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Quantity available:</span>
                  <span className="text-sm font-medium text-gray-900">{product.quantity} {product.unit}</span>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-2">Select Quantity</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={product.quantity}
                    value={buyQuantity}
                    onChange={(e) => setBuyQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-full text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-600">
                    {product.unit}
                  </span>
                </div>
                {buyQuantity > 0 && buyQuantity <= product.quantity && (
                  <p className="text-xs text-gray-500 mt-2">
                    Total: {(product.price * buyQuantity).toFixed(2)} euro
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleAddToCart}
                  disabled={isAddingToCart || buyQuantity < 1 || buyQuantity > product.quantity}
                  className="w-full bg-black text-white py-3 rounded-full text-base font-medium hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isAddingToCart ? 'Adding...' : 'Add to Cart'}
                </button>
                <button
                  onClick={() => {
                    setShowBuyModal(false);
                    setBuyQuantity(1);
                  }}
                  className="w-full text-sm text-gray-600 hover:text-gray-900 underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

