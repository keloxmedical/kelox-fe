'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/contexts/UserContext';
import { authenticatedFetch } from '@/lib/api';
import NavBar from '@/app/components/NavBar';
import DeliveryAddressModal from '@/app/components/DeliveryAddressModal';
import AlertModal from '@/app/components/AlertModal';
import { useAlert } from '@/hooks/useAlert';

interface DeliveryAddress {
  id: number;
  hospitalId: number;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export default function CartPage() {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const { jwtToken, hospitalProfile, shoppingCart, isLoadingCart, fetchShoppingCart } = useUser();
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<DeliveryAddress | null>(null);
  const alert = useAlert();

  useEffect(() => {
    // Redirect if not authenticated
    if (ready && !authenticated) {
      console.log('Not authenticated, redirecting to home');
      router.push('/');
      return;
    }
  }, [ready, authenticated, router]);

  // Fetch/refresh shopping cart when page loads
  useEffect(() => {
    if (hospitalProfile && jwtToken) {
      fetchShoppingCart();
    }
  }, [hospitalProfile, jwtToken]);

  const formatExpiryDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  const handleRemoveItem = async (itemId: number, isFromOffer: boolean, itemCount: number = 1) => {
    if (!hospitalProfile) return;

    let confirmMessage = '';
    let confirmTitle = '';
    if (isFromOffer) {
      confirmTitle = 'Remove Entire Offer';
      confirmMessage = `This item is part of an accepted offer. Removing it will remove all ${itemCount} product${itemCount > 1 ? 's' : ''} from this offer.`;
    } else {
      confirmTitle = 'Remove Item';
      confirmMessage = 'Are you sure you want to remove this item from your cart?';
    }

    const confirmed = await alert.showConfirm(confirmMessage, confirmTitle, 'Remove', 'Cancel');
    if (!confirmed) return;

    try {
      const response = await authenticatedFetch(
        `/api/shop/hospitals/${hospitalProfile.id}/cart/items/${itemId}`,
        {
          method: 'DELETE'
        }
      );

      if (response.ok || response.status === 204) {
        // Refresh shopping cart
        await fetchShoppingCart();
      } else {
        throw new Error('Failed to remove item');
      }
    } catch (error) {
      console.error('Error removing item:', error);
      await alert.showAlert('Failed to remove item. Please try again.', 'Error');
    }
  };

  // Group cart items by offerId
  const groupItemsByOffer = () => {
    if (!shoppingCart?.items) return { offerGroups: {}, individualItems: [] };

    const groups: { [key: string]: typeof shoppingCart.items } = {};
    const individual: typeof shoppingCart.items = [];

    shoppingCart.items.forEach(item => {
      if (item.offerId) {
        if (!groups[item.offerId]) {
          groups[item.offerId] = [];
        }
        groups[item.offerId].push(item);
      } else {
        individual.push(item);
      }
    });

    return { offerGroups: groups, individualItems: individual };
  };

  if (!ready || !authenticated || !jwtToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const totalProductsCost = shoppingCart?.totalAmount || 0;
  const platformFee = totalProductsCost * 0.10; // 10% of products cost
  const hasItems = shoppingCart && shoppingCart.items && shoppingCart.items.length > 0;
  const { offerGroups, individualItems } = groupItemsByOffer();

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Cart Items */}
          <div className="lg:col-span-2">
            {/* Cart Header */}
            <div className="mb-6">
              <div className="flex items-start gap-4 mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">My shopping cart</h1>
                  {hasItems && (
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                      </svg>
                      <p className="text-sm text-gray-600">
                        You have {shoppingCart.items.length} item{shoppingCart.items.length !== 1 ? 's' : ''} in your shopping cart, 
                        delivered by Kelox Medical.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cart Items List */}
            {isLoadingCart ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading cart...</p>
                </div>
              </div>
            ) : !hasItems ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-gray-600 text-lg">Your cart is empty</p>
                <button
                  onClick={() => router.push('/marketplace')}
                  className="mt-4 px-6 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Offer Groups */}
                {Object.entries(offerGroups).map(([offerId, items]) => {
                  const hospitalName = items[0].product.sellerHospitalName;
                  const groupTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                  const groupTotalWhole = Math.floor(groupTotal);
                  const groupTotalCents = Math.round((groupTotal - groupTotalWhole) * 100);

                  return (
                    <div key={offerId} className="border-2 border-gray-300 rounded-2xl p-6 bg-white relative">
                      {/* Remove Button for Entire Offer */}
                      <button
                        onClick={() => handleRemoveItem(items[0].id, true, items.length)}
                        className="absolute top-4 right-4 w-8 h-8 bg-red-100 text-red-600 rounded-full hover:bg-red-200 hover:text-red-700 flex items-center justify-center cursor-pointer transition-colors"
                        title="Remove entire offer"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      {/* Offer Header */}
                      <div className="mb-4 pb-4 border-b border-gray-200 mr-12">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">From Offer</h3>
                            <p className="text-sm text-gray-600">by {hospitalName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">Group Total</p>
                            <p className="text-xl font-bold text-gray-900">
                              {groupTotalWhole}
                              <sup className="text-sm">{String(groupTotalCents).padStart(2, '0')}</sup>
                              <span className="text-sm font-normal ml-1">euro</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Products in Offer */}
                      <div className="space-y-3">
                        {items.map((item) => {
                          const itemTotal = item.price * item.quantity;
                          const totalWhole = Math.floor(itemTotal);
                          const totalCents = Math.round((itemTotal - totalWhole) * 100);

                          return (
                            <div key={item.id} className="bg-secondary rounded-xl p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="text-base font-semibold text-gray-900 mb-1">{item.product.name}</h4>
                                  <p className="text-xs text-gray-600">Code: {item.product.code}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-gray-900">
                                    {totalWhole}
                                    <sup className="text-xs">{String(totalCents).padStart(2, '0')}</sup>
                                    <span className="text-sm font-normal ml-1">euro</span>
                                  </p>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-xs">
                                <div>
                                  <p className="text-gray-500">Unit</p>
                                  <p className="text-gray-700 font-medium">{item.product.unit}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Quantity</p>
                                  <p className="text-gray-700 font-medium">{item.quantity}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Price/unit</p>
                                  <p className="text-gray-700 font-medium">{item.price.toFixed(2)} euro</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Individual Items (null offerId) */}
                {individualItems.length > 0 && (
                  <div className="space-y-4">
                    {individualItems.length > 1 && (
                      <h3 className="text-lg font-bold text-gray-900">Individual Products</h3>
                    )}
                    {individualItems.map((item) => {
                      const priceWhole = Math.floor(item.price);
                      const priceCents = Math.round((item.price - priceWhole) * 100);
                      const itemTotal = item.price * item.quantity;
                      const totalWhole = Math.floor(itemTotal);
                      const totalCents = Math.round((itemTotal - totalWhole) * 100);

                      return (
                        <div key={item.id} className="bg-secondary border border-secondary-2 rounded-2xl p-6 relative">
                          {/* Remove Button */}
                          <button
                            onClick={() => handleRemoveItem(item.id, false)}
                            className="absolute top-4 right-4 w-7 h-7 bg-red-100 text-red-600 rounded-full hover:bg-red-200 hover:text-red-700 flex items-center justify-center cursor-pointer transition-colors"
                            title="Remove from cart"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>

                          {/* Product Header */}
                          <div className="mb-4 mr-10">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.product.name}</h3>
                            <p className="text-sm text-gray-600">by {item.product.sellerHospitalName}</p>
                          </div>

                          {/* Product Details Grid */}
                          <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                            <div>
                              <p className="text-gray-500 text-xs mb-1">Type</p>
                              <p className="text-gray-700 font-medium">{item.product.unit}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-1">Quantity</p>
                              <p className="text-gray-700 font-medium">{item.quantity}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-1">Expiry date</p>
                              <p className="text-gray-700 font-medium">{formatExpiryDate(item.product.expiryDate)}</p>
                            </div>
                          </div>

                          {/* Brand */}
                          {item.product.manufacturer && (
                            <div className="mb-2">
                              <p className="text-xs text-gray-500">Brand</p>
                              <p className="text-sm text-gray-900">{item.product.manufacturer}</p>
                            </div>
                          )}

                          {/* Product Code and Total */}
                          <div className="flex items-end justify-between pt-4 border-t border-gray-300">
                            <div>
                              <p className="text-xs text-gray-500">Product code</p>
                              <p className="text-sm text-gray-900">{item.product.code}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500 mb-1">Total</p>
                              <p className="text-2xl font-bold text-gray-900">
                                {totalWhole}
                                <sup className="text-sm">{String(totalCents).padStart(2, '0')}</sup>
                                <span className="text-base font-normal ml-1">euro</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Order Summary */}
          {hasItems && (
            <div className="lg:col-span-1">
              <div className="bg-primary rounded-2xl p-6 sticky top-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Order summary</h2>

                {/* Cost Breakdown */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Products cost:</span>
                    <span className="text-sm font-medium text-gray-900">{totalProductsCost.toFixed(2)} euro</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Delivery fee:</span>
                    <button 
                      onClick={async () => {
                        if (!selectedAddress) {
                          await alert.showAlert('Please select a delivery address first', 'Address Required');
                          return;
                        }
                        // TODO: Implement request delivery fee price
                        await alert.showAlert('Request delivery fee feature coming soon', 'Coming Soon');
                      }}
                      className="px-4 py-1 bg-black text-white rounded-full text-xs hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      Request price
                    </button>
                  </div>
                  <div className="flex items-center justify-between pb-4 border-b border-gray-300">
                    <span className="text-sm text-gray-600">Platform fee:</span>
                    <span className="text-sm font-medium text-gray-900">{platformFee.toFixed(2)} euro</span>
                  </div>
                </div>

                {/* Total */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-900">Total:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-gray-900">
                      {(totalProductsCost + platformFee).toFixed(2)} euro + deliver fee
                    </p>
                    <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                  </div>
                </div>

                {/* Mandatory Actions */}
                <div>
                  <p className="text-xs text-gray-600 mb-4">Mandatory actions before payment</p>
                  
                  {/* Action 1 - Select delivery address */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-900 mb-2">1. Add delivery address</p>
                    {selectedAddress ? (
                      <div className="bg-white rounded-xl p-4 border border-gray-300">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm text-gray-900 font-medium">{selectedAddress.streetAddress}</p>
                            <p className="text-xs text-gray-600">
                              {selectedAddress.city}{selectedAddress.state ? `, ${selectedAddress.state}` : ''} {selectedAddress.postalCode}
                            </p>
                            <p className="text-xs text-gray-600">{selectedAddress.country}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowAddressModal(true)}
                          className="text-xs text-gray-700 hover:text-gray-900 underline cursor-pointer"
                        >
                          Change address
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowAddressModal(true)}
                        className="w-full px-4 py-2 bg-black text-white rounded-full text-sm hover:bg-gray-800 transition-colors cursor-pointer"
                      >
                        Select Delivery Address
                      </button>
                    )}
                  </div>

                  {/* Action 2 - Request delivery fee */}
                  <div>
                    <p className="text-sm text-gray-900 mb-2">2. Request delivery fee price</p>
                    <button 
                      onClick={async () => {
                        if (!selectedAddress) {
                          await alert.showAlert('Please select a delivery address first', 'Address Required');
                          return;
                        }
                        // TODO: Implement request delivery fee price
                        await alert.showAlert('Request delivery fee feature coming soon', 'Coming Soon');
                      }}
                      className="w-full px-4 py-2 bg-black text-white rounded-full text-sm hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      Request price
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Delivery Address Modal */}
      {hospitalProfile && (
        <DeliveryAddressModal
          isOpen={showAddressModal}
          onClose={() => setShowAddressModal(false)}
          hospitalId={hospitalProfile.id}
          onAddressSelected={(address) => {
            setSelectedAddress(address);
            console.log('Selected address:', address);
          }}
        />
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alert.isOpen}
        title={alert.config.title}
        message={alert.config.message}
        type={alert.config.type}
        confirmText={alert.config.confirmText}
        cancelText={alert.config.cancelText}
        onConfirm={alert.handleConfirm}
        onCancel={alert.handleCancel}
      />
    </div>
  );
}

