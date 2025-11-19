'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/contexts/UserContext';
import { authenticatedFetch } from '@/lib/api';
import NavBar from '@/app/components/NavBar';
import OfferModal from '@/app/components/OfferModal';

interface OfferProduct {
  productId: number;
  quantity: number;
  price: number;
  productName: string;
  productCode: string;
}

interface OfferResponse {
  id: string;
  hospitalId: number;
  hospitalName: string;
  creatorId: string;
  creatorEmail: string;
  creatorHospitalName: string;
  products: OfferProduct[];
  createdAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

interface UserOffersResponse {
  createdOffers: OfferResponse[];
  receivedOffers: OfferResponse[];
}

export default function MyOffersPage() {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const { jwtToken, hospitalProfile, isLoadingProfile } = useUser();
  const [activeTab, setActiveTab] = useState<'outgoing' | 'incoming'>('outgoing');
  const [offers, setOffers] = useState<UserOffersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<OfferResponse | null>(null);
  const [showEditOfferModal, setShowEditOfferModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [isReopeningOffer, setIsReopeningOffer] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Only redirect if authentication is ready and there's no token
    if (ready && !authenticated) {
      console.log('Not authenticated, redirecting to home');
      router.push('/');
      return;
    }
  }, [ready, authenticated, router]);

  useEffect(() => {
    const fetchOffers = async () => {
      // Wait for authentication to be fully ready before fetching
      if (!ready || !authenticated || !jwtToken) {
        console.log('Waiting for authentication to be ready...');
        return;
      }

      try {
        setIsLoading(true);
        const response = await authenticatedFetch('/api/offers/my-offers');
        
        if (!response.ok) {
          console.error('Failed to fetch offers:', response.status, response.statusText);
          throw new Error('Failed to fetch offers');
        }

        const data = await response.json();
        setOffers(data);
      } catch (error) {
        console.error('Error fetching offers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOffers();
  }, [ready, authenticated, jwtToken]);

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

  const handleEditOffer = (offer: OfferResponse) => {
    setSelectedOffer(offer);
    setIsReopeningOffer(false);
    setShowEditOfferModal(true);
  };

  const handleReopenOffer = (offer: OfferResponse) => {
    setSelectedOffer(offer);
    setIsReopeningOffer(true);
    setShowEditOfferModal(true);
  };

  const handleJoinConversation = (offer: OfferResponse) => {
    setSelectedOffer(offer);
    setShowChatModal(true);
  };

  const refreshOffers = async () => {
    try {
      const response = await authenticatedFetch('/api/offers/my-offers');
      if (response.ok) {
        const data = await response.json();
        setOffers(data);
        
        // Update selectedOffer if it's currently selected
        if (selectedOffer) {
          const allOffers = [...data.createdOffers, ...data.receivedOffers];
          const updatedSelectedOffer = allOffers.find(o => o.id === selectedOffer.id);
          if (updatedSelectedOffer) {
            setSelectedOffer(updatedSelectedOffer);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing offers:', error);
    }
  };

  const handleCancelOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to cancel this offer?')) return;

    try {
      setIsUpdating(true);
      const response = await authenticatedFetch(`/api/offers/${offerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const updatedOffer = await response.json();
        alert('Offer cancelled successfully');
        
        // Update the selected offer if it's currently displayed
        if (selectedOffer?.id === offerId) {
          setSelectedOffer(updatedOffer);
        }
        
        // Refresh the full offers list
        await refreshOffers();
      } else {
        throw new Error('Failed to cancel offer');
      }
    } catch (error) {
      console.error('Error cancelling offer:', error);
      alert('Failed to cancel offer. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to accept this offer?')) return;

    try {
      setIsUpdating(true);
      const response = await authenticatedFetch(`/api/offers/${offerId}/accept`, {
        method: 'POST'
      });

      if (response.ok) {
        const updatedOffer = await response.json();
        alert('Offer accepted successfully');
        
        // Update the selected offer to show new status
        setSelectedOffer(updatedOffer);
        
        // Refresh the full offers list
        await refreshOffers();
      } else {
        throw new Error('Failed to accept offer');
      }
    } catch (error) {
      console.error('Error accepting offer:', error);
      alert('Failed to accept offer. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to reject this offer?')) return;

    try {
      setIsUpdating(true);
      const response = await authenticatedFetch(`/api/offers/${offerId}/reject`, {
        method: 'POST'
      });

      if (response.ok) {
        const updatedOffer = await response.json();
        alert('Offer rejected successfully');
        
        // Update the selected offer to show new status
        setSelectedOffer(updatedOffer);
        
        // Refresh the full offers list
        await refreshOffers();
      } else {
        throw new Error('Failed to reject offer');
      }
    } catch (error) {
      console.error('Error rejecting offer:', error);
      alert('Failed to reject offer. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!ready || !authenticated || isLoadingProfile || !jwtToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const displayOffers = activeTab === 'outgoing' ? offers?.createdOffers || [] : offers?.receivedOffers || [];

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Page Title */}
        <h1 className="text-4xl font-bold text-gray-900 mb-8">My Offers</h1>

        {/* Tabs */}
        <div className="flex gap-8 border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab('outgoing')}
            className={`pb-4 px-2 font-medium transition-colors relative cursor-pointer ${
              activeTab === 'outgoing'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Outgoing {offers && `(${offers.createdOffers.length})`}
            {activeTab === 'outgoing' && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gray-900 -mb-px"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('incoming')}
            className={`pb-4 px-2 font-medium transition-colors relative cursor-pointer ${
              activeTab === 'incoming'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Incoming {offers && `(${offers.receivedOffers.length})`}
            {activeTab === 'incoming' && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gray-900 -mb-px"></div>
            )}
          </button>
        </div>

        {/* Offers List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading offers...</p>
            </div>
          </div>
        ) : displayOffers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">
              {activeTab === 'outgoing' 
                ? 'You have not made any offers yet.' 
                : 'You have not received any offers yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayOffers.map((offer) => {
              const totalPrice = calculateOfferTotal(offer);
              const primaryProduct = offer.products[0];

              return (
                <div
                  key={offer.id}
                  className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow"
                >
                  {/* Offer Header */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        offer.status === 'PENDING' 
                          ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' 
                          : offer.status === 'REJECTED'
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : 'bg-green-100 text-green-700 border border-green-300'
                      }`}>
                        {offer.status === 'PENDING' ? 'Pending' : offer.status === 'REJECTED' ? 'Rejected' : 'Accepted'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mb-1">
                      {totalPrice.toFixed(2)} euro
                    </p>
                    <p className="text-sm text-gray-600">
                      {activeTab === 'outgoing' 
                        ? `for ${offer.hospitalName}`
                        : `by ${offer.creatorHospitalName}`
                      }
                    </p>
                  </div>

                  {/* Offer Footer */}
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-xs text-gray-500">{getTimeAgo(offer.createdAt)}</p>
                    <button
                      onClick={() => handleJoinConversation(offer)}
                      className="bg-black text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Offer Modal (for outgoing offers) */}
      {showEditOfferModal && selectedOffer && (
        <OfferModal
          isOpen={showEditOfferModal}
          onClose={() => {
            setShowEditOfferModal(false);
            setSelectedOffer(null);
            setIsReopeningOffer(false);
          }}
          existingOffer={selectedOffer}
          hospitalId={selectedOffer.hospitalId}
          hospitalName={selectedOffer.hospitalName}
          isReopening={isReopeningOffer}
          onSuccess={() => {
            refreshOffers();
            setShowEditOfferModal(false);
            setSelectedOffer(null);
            setIsReopeningOffer(false);
          }}
        />
      )}

      {/* Chat Modal */}
      {showChatModal && selectedOffer && (
        <OfferModal
          isOpen={showChatModal}
          onClose={() => {
            setShowChatModal(false);
            setSelectedOffer(null);
          }}
          existingOffer={selectedOffer}
          hospitalId={selectedOffer.hospitalId}
          hospitalName={selectedOffer.hospitalName}
          isChatMode={true}
          activeTab={activeTab}
          onSuccess={refreshOffers}
          onAccept={handleAcceptOffer}
          onReject={handleRejectOffer}
          onCancel={(offerId) => {
            handleCancelOffer(offerId);
            setShowChatModal(false);
          }}
          onReopen={() => {
            setShowChatModal(false);
            handleReopenOffer(selectedOffer);
          }}
        />
      )}

    </div>
  );
}

