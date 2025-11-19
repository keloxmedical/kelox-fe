'use client';

import { useState, useEffect, useRef } from 'react';
import { authenticatedFetch, BACKEND_API } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';

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

interface OfferProduct {
  productId: string;
  productName: string;
  sellerPrice: number;
  currency: string;
  maxQuantity: number;
  unit: string;
  quantity: number;
  offerPrice: number;
}

interface ExistingOffer {
  id: string;
  hospitalId: number;
  hospitalName: string;
  products: {
    productId: number;
    quantity: number;
    price: number;
    productName: string;
    productCode: string;
  }[];
  status: string;
}

interface OfferMessage {
  id: string;
  offerId: string;
  senderId: string;
  senderHospitalName: string;
  message: string;
  type: string | null;
  createdAt: string;
}

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProduct?: ProductDetails;
  existingOffer?: ExistingOffer | null;
  hospitalId: number;
  hospitalName: string;
  onSuccess?: () => void;
  isReopening?: boolean;
  isChatMode?: boolean;
  activeTab?: 'outgoing' | 'incoming';
  onAccept?: (offerId: string) => void;
  onReject?: (offerId: string) => void;
  onCancel?: (offerId: string) => void;
  onReopen?: () => void;
}

export default function OfferModal({
  isOpen,
  onClose,
  initialProduct,
  existingOffer,
  hospitalId,
  hospitalName,
  onSuccess,
  isReopening = false,
  isChatMode = false,
  activeTab,
  onAccept,
  onReject,
  onCancel,
  onReopen
}: OfferModalProps) {
  const { hospitalProfile } = useUser();
  const [offerProducts, setOfferProducts] = useState<OfferProduct[]>([]);
  const [availableProducts, setAvailableProducts] = useState<ProductDetails[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [offerMessage, setOfferMessage] = useState('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<OfferMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableProducts, setEditableProducts] = useState<OfferProduct[]>([]);
  const [showProductSelectorInChat, setShowProductSelectorInChat] = useState(false);
  const [isUpdatingOffer, setIsUpdatingOffer] = useState(false);
  
  // Reject reason modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const initializeOffer = async () => {
      // Fetch all products from the seller
      const sellerProducts = await fetchSellerProducts(hospitalId);

      if (existingOffer) {
        // Pre-populate with existing offer data
        const mappedProducts: OfferProduct[] = existingOffer.products.map((offerProd) => {
          const fullProduct = sellerProducts.find(p => p.id.toString() === offerProd.productId.toString());
          
          return {
            productId: offerProd.productId.toString(),
            productName: offerProd.productName,
            sellerPrice: fullProduct?.price || 0,
            currency: fullProduct?.currency || 'euro',
            maxQuantity: fullProduct?.quantity || 0,
            unit: fullProduct?.unit || 'piece',
            quantity: offerProd.quantity,
            offerPrice: offerProd.price
          };
        });
        setOfferProducts(mappedProducts);
      } else if (initialProduct) {
        // Initialize with the initial product
        setOfferProducts([{
          productId: initialProduct.id,
          productName: initialProduct.name,
          sellerPrice: initialProduct.price,
          currency: initialProduct.currency,
          maxQuantity: initialProduct.quantity,
          unit: initialProduct.unit,
          quantity: 0,
          offerPrice: 0
        }]);
      }
    };

    initializeOffer();
  }, [isOpen, existingOffer, initialProduct, hospitalId]);

  // Fetch messages when modal opens in chat mode
  useEffect(() => {
    if (!isOpen || !isChatMode || !existingOffer?.id) return;

    const fetchMessages = async (isInitialLoad = false) => {
      try {
        if (isInitialLoad) {
          setIsLoadingMessages(true);
        }
        const response = await authenticatedFetch(`/api/offers/${existingOffer.id}/chat`);
        
        if (response.ok) {
          const data: OfferMessage[] = await response.json();
          setMessages(data);
          // Scroll to bottom after messages load
          setTimeout(() => scrollToBottom(), 100);
        } else {
          console.error('Failed to fetch messages:', response.status);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        if (isInitialLoad) {
          setIsLoadingMessages(false);
        }
      }
    };

    // Initial fetch
    fetchMessages(true);

    // Set up auto-refresh every 5 seconds
    const intervalId = setInterval(() => {
      fetchMessages(false);
    }, 5000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [isOpen, isChatMode, existingOffer?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSellerProducts = async (hospitalId: number): Promise<ProductDetails[]> => {
    try {
      const response = await fetch(`${BACKEND_API}/api/marketplace/hospitals/${hospitalId}/products`);
      if (response.ok) {
        const data = await response.json();
        setAvailableProducts(data);
        return data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching seller products:', error);
      return [];
    }
  };

  const handleAddProduct = (selectedProduct: ProductDetails) => {
    if (offerProducts.some(p => p.productId.toString() === selectedProduct.id.toString())) {
      alert('This product is already in your offer');
      return;
    }

    setOfferProducts([...offerProducts, {
      productId: selectedProduct.id.toString(),
      productName: selectedProduct.name,
      sellerPrice: selectedProduct.price,
      currency: selectedProduct.currency,
      maxQuantity: selectedProduct.quantity,
      unit: selectedProduct.unit,
      quantity: 0,
      offerPrice: 0
    }]);
    setShowProductSelector(false);
  };

  const updateOfferProduct = (index: number, field: 'quantity' | 'offerPrice', value: number) => {
    const updated = [...offerProducts];
    if (field === 'quantity' && value > updated[index].maxQuantity) {
      alert(`Quantity cannot exceed ${updated[index].maxQuantity}`);
      return;
    }
    updated[index][field] = value;
    setOfferProducts(updated);
  };

  const removeOfferProduct = (index: number) => {
    setOfferProducts(offerProducts.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return offerProducts.reduce((sum, p) => sum + (p.offerPrice * p.quantity), 0);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !existingOffer?.id) return;
    
    if (newMessage.length > 255) {
      alert('Message must be 255 characters or less');
      return;
    }

    try {
      setIsSendingMessage(true);
      const response = await authenticatedFetch(`/api/offers/${existingOffer.id}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message: newMessage.trim() })
      });

      if (response.ok) {
        const sentMessage: OfferMessage = await response.json();
        setMessages([...messages, sentMessage]);
        setNewMessage('');
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleRejectWithReason = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    if (rejectReason.length > 255) {
      alert('Reason must be 255 characters or less');
      return;
    }

    if (!existingOffer?.id) return;

    try {
      setIsRejecting(true);

      // First, send the rejection message to chat with type "REJECT"
      const messageResponse = await authenticatedFetch(`/api/offers/${existingOffer.id}/chat`, {
        method: 'POST',
        body: JSON.stringify({ 
          message: rejectReason.trim(),
          type: 'REJECTED'
        })
      });

      if (!messageResponse.ok) {
        throw new Error('Failed to send rejection message');
      }

      const sentMessage: OfferMessage = await messageResponse.json();
      setMessages([...messages, sentMessage]);

      // Then call the reject endpoint
      if (onReject) {
        onReject(existingOffer.id);
      }

      // Close the modal and reset state
      setShowRejectModal(false);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting offer:', error);
      alert('Failed to reject offer. Please try again.');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleEnterEditMode = async () => {
    // Fetch all available products from the seller
    await fetchSellerProducts(hospitalId);
    
    // Map existing offer products to editable format
    if (existingOffer) {
      const mapped: OfferProduct[] = existingOffer.products.map((p) => {
        const fullProduct = availableProducts.find(ap => ap.id.toString() === p.productId.toString());
        return {
          productId: p.productId.toString(),
          productName: p.productName,
          sellerPrice: fullProduct?.price || 0,
          currency: fullProduct?.currency || 'euro',
          maxQuantity: fullProduct?.quantity || 0,
          unit: fullProduct?.unit || 'piece',
          quantity: p.quantity,
          offerPrice: p.price
        };
      });
      setEditableProducts(mapped);
    }
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditableProducts([]);
    setShowProductSelectorInChat(false);
  };

  const handleAddProductToEdit = (selectedProduct: ProductDetails) => {
    if (editableProducts.some(p => p.productId.toString() === selectedProduct.id.toString())) {
      alert('This product is already in your offer');
      return;
    }

    setEditableProducts([...editableProducts, {
      productId: selectedProduct.id.toString(),
      productName: selectedProduct.name,
      sellerPrice: selectedProduct.price,
      currency: selectedProduct.currency,
      maxQuantity: selectedProduct.quantity,
      unit: selectedProduct.unit,
      quantity: 0,
      offerPrice: 0
    }]);
    setShowProductSelectorInChat(false);
  };

  const updateEditableProduct = (index: number, field: 'quantity' | 'offerPrice', value: number) => {
    const updated = [...editableProducts];
    if (field === 'quantity' && value > updated[index].maxQuantity) {
      alert(`Quantity cannot exceed ${updated[index].maxQuantity}`);
      return;
    }
    updated[index][field] = value;
    setEditableProducts(updated);
  };

  const removeEditableProduct = (index: number) => {
    setEditableProducts(editableProducts.filter((_, i) => i !== index));
  };

  const calculateEditTotal = () => {
    return editableProducts.reduce((sum, p) => sum + (p.offerPrice * p.quantity), 0);
  };

  const handleSaveOffer = async () => {
    if (editableProducts.some(p => p.quantity === 0 || p.offerPrice === 0)) {
      alert('Please fill in quantity and price for all products');
      return;
    }

    if (!existingOffer) return;

    try {
      setIsUpdatingOffer(true);
      
      const offerData = {
        hospitalId: hospitalId,
        products: editableProducts.map(p => ({
          productId: Number(p.productId),
          quantity: p.quantity,
          price: p.offerPrice
        }))
      };

      const response = await authenticatedFetch(`/api/offers/${existingOffer.id}`, {
        method: 'PUT',
        body: JSON.stringify(offerData)
      });

      if (response.ok) {
        alert('Offer updated successfully!');
        
        // Refresh data from parent which will update selectedOffer
        if (onSuccess) {
          await onSuccess();
        }
        
        // Small delay to ensure state updates propagate
        setTimeout(() => {
          setIsEditMode(false);
          setEditableProducts([]);
        }, 100);
      } else {
        throw new Error('Failed to update offer');
      }
    } catch (error) {
      console.error('Error updating offer:', error);
      alert('Failed to update offer. Please try again.');
    } finally {
      setIsUpdatingOffer(false);
    }
  };

  const handleSubmitOffer = async () => {
    if (offerProducts.some(p => p.quantity === 0 || p.offerPrice === 0)) {
      alert('Please fill in quantity and price for all products');
      return;
    }

    try {
      setIsSubmittingOffer(true);
      
      const offerData = {
        hospitalId: hospitalId,
        products: offerProducts.map(p => ({
          productId: Number(p.productId),
          quantity: p.quantity,
          price: p.offerPrice
        }))
      };

      let endpoint: string;
      let method: string;
      let successMessage: string;

      if (isReopening && existingOffer) {
        // Re-opening a rejected offer
        endpoint = `/api/offers/${existingOffer.id}/reopen`;
        method = 'PUT';
        successMessage = 'Offer re-opened successfully!';
      } else if (existingOffer) {
        // Editing an existing pending offer
        endpoint = `/api/offers/${existingOffer.id}`;
        method = 'PUT';
        successMessage = 'Offer updated successfully!';
      } else {
        // Creating a new offer
        endpoint = '/api/offers';
        method = 'POST';
        successMessage = 'Offer submitted successfully!';
      }

      const response = await authenticatedFetch(endpoint, {
        method: method,
        body: JSON.stringify(offerData)
      });

      if (response.ok) {
        alert(successMessage);
        if (onSuccess) onSuccess();
        handleClose();
      } else {
        throw new Error('Failed to submit offer');
      }
    } catch (error) {
      console.error('Error submitting offer:', error);
      alert('Failed to submit offer. Please try again.');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleClose = () => {
    setOfferProducts([]);
    setOfferMessage('');
    setShowProductSelector(false);
    setMessages([]);
    setNewMessage('');
    setShowRejectModal(false);
    setRejectReason('');
    onClose();
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return 'Just now';
  };

  if (!isOpen) return null;

  // Chat Mode - Two Column Layout
  if (isChatMode && existingOffer) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl max-w-6xl w-full h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Offer Conversation</h2>
                <p className="text-sm text-gray-600 mt-1">{hospitalName}</p>
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
          </div>

          {/* Two Column Layout */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Column - Full Offer Details with Actions */}
            <div className="w-1/2 border-r border-gray-200 p-6 overflow-y-auto">
              {!isEditMode ? (
                /* View Mode */
                <>
                  {/* Status Badge */}
                  <div className="mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      existingOffer.status === 'PENDING' 
                        ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' 
                        : existingOffer.status === 'REJECTED'
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-green-100 text-green-700 border border-green-300'
                    }`}>
                      {existingOffer.status}
                    </span>
                  </div>
                  
                  {/* Total Price */}
                  <div className="mb-6">
                    <p className="text-3xl font-bold text-gray-900">
                      Total {calculateTotal().toFixed(2)} euro
                    </p>
                  </div>

                  {/* Product List */}
                  <div className="space-y-4 mb-6">
                    {existingOffer.products.map((product, index) => (
                      <div key={index} className="bg-gray-50 rounded-2xl p-4">
                        <p className="font-medium text-gray-900 mb-2">{product.productName}</p>
                        <p className="text-sm text-gray-600 mb-3">Product code: {product.productCode}</p>
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 mb-1">Price</p>
                            <p className="text-sm font-medium text-gray-900">{product.price.toFixed(2)} euro</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 mb-1">Quantity</p>
                            <p className="text-sm font-medium text-gray-900">{product.quantity}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  {activeTab === 'outgoing' ? (
                    /* Outgoing Offer Actions */
                    <div className="space-y-3">
                      {existingOffer.status === 'PENDING' && (
                        <>
                          <button
                            onClick={handleEnterEditMode}
                            className="w-full bg-black text-white py-3 rounded-full text-base font-medium hover:bg-gray-800 transition-colors cursor-pointer"
                          >
                            Edit Offer
                          </button>
                          <button
                            onClick={() => {
                              if (onCancel) onCancel(existingOffer.id);
                            }}
                            className="w-full py-2 text-sm text-gray-700 hover:text-gray-900 font-medium cursor-pointer"
                          >
                            Cancel offer
                          </button>
                        </>
                      )}
                      {existingOffer.status === 'REJECTED' && (
                        <button
                          onClick={() => {
                            if (onReopen) onReopen();
                          }}
                          className="w-full bg-black text-white py-3 rounded-full text-base font-medium hover:bg-gray-800 transition-colors cursor-pointer"
                        >
                          Re-open Offer
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Incoming Offer Actions */
                    existingOffer.status === 'PENDING' && (
                      <div className="space-y-3">
                        <button
                          onClick={() => {
                            if (onAccept) onAccept(existingOffer.id);
                          }}
                          className="w-full bg-black text-white py-3 rounded-full text-base font-medium hover:bg-gray-800 transition-colors cursor-pointer"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => setShowRejectModal(true)}
                          className="w-full bg-secondary text-gray-900 py-3 rounded-full text-base font-medium hover:bg-secondary-2 transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    )
                  )}
                </>
              ) : (
                /* Edit Mode */
                <>
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Edit Offer</h3>
                  </div>

                  {/* Total Price */}
                  <div className="mb-6">
                    <p className="text-3xl font-bold text-gray-900">
                      Total {calculateEditTotal().toFixed(2)} euro
                    </p>
                  </div>

                  {/* Editable Product List */}
                  <div className="space-y-4 mb-4">
                    {editableProducts.map((product, index) => {
                      const priceWhole = Math.floor(product.sellerPrice);
                      const priceCents = Math.round((product.sellerPrice - priceWhole) * 100);
                      
                      return (
                        <div key={index} className="relative">
                          {editableProducts.length > 1 && (
                            <button
                              onClick={() => removeEditableProduct(index)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center text-sm cursor-pointer z-10"
                            >
                              ×
                            </button>
                          )}
                          <div className="bg-gray-50 rounded-2xl p-4">
                            <p className="text-sm font-medium text-gray-900 mb-1">{product.productName}</p>
                            <p className="text-xs text-gray-600 mb-3">
                              Seller: {priceWhole}<sup className="text-xs">{String(priceCents).padStart(2, '0')}</sup> {product.currency} | Max: {product.maxQuantity} {product.unit}
                            </p>
                            <div className="flex gap-2">
                              <div className="flex-1 relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={product.offerPrice || ''}
                                  onChange={(e) => updateEditableProduct(index, 'offerPrice', parseFloat(e.target.value) || 0)}
                                  placeholder="Price"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-full text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">
                                  euro
                                </span>
                              </div>
                              <div className="flex-1 relative">
                                <input
                                  type="number"
                                  min="0"
                                  max={product.maxQuantity}
                                  value={product.quantity || ''}
                                  onChange={(e) => updateEditableProduct(index, 'quantity', parseInt(e.target.value) || 0)}
                                  placeholder="Qty"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-full text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Product Button */}
                  <button
                    onClick={() => setShowProductSelectorInChat(!showProductSelectorInChat)}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-900 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer mb-4"
                  >
                    + Add Product
                  </button>

                  {/* Product Selector */}
                  {showProductSelectorInChat && (
                    <div className="mb-4 max-h-40 overflow-y-auto border border-gray-300 rounded-2xl">
                      {availableProducts.length === 0 ? (
                        <p className="p-3 text-xs text-gray-600">Loading...</p>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {availableProducts
                            .filter(p => !editableProducts.some(ep => ep.productId.toString() === p.id.toString()))
                            .map((ap) => (
                              <button
                                key={ap.id}
                                onClick={() => handleAddProductToEdit(ap)}
                                className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                              >
                                <p className="text-xs font-medium text-gray-900">{ap.name}</p>
                                <p className="text-xs text-gray-500">{ap.code}</p>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Save/Cancel Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={handleSaveOffer}
                      disabled={isUpdatingOffer}
                      className="w-full bg-black text-white py-3 rounded-full text-base font-medium hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isUpdatingOffer ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="w-full py-2 text-sm text-gray-700 hover:text-gray-900 font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Right Column - Chat */}
            <div className="w-1/2 flex flex-col">
              {/* Messages Area */}
              <div className="flex-1 p-6 overflow-y-auto">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600">Loading messages...</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-gray-500">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.map((message, index) => {
                      const isOwnMessage = message.senderHospitalName === hospitalProfile?.name;
                      const previousMessage = index > 0 ? messages[index - 1] : null;
                      const isFirstInGroup = !previousMessage || previousMessage.senderHospitalName !== message.senderHospitalName;
                      
                      return (
                        <div key={message.id} className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                          {isFirstInGroup && !message.type && (
                            <span className="text-xs font-medium text-gray-900 mb-1 px-2">
                              {message.senderHospitalName}
                            </span>
                          )}
                          <div className={`rounded-2xl px-4 py-3 max-w-[80%] break-words ${
                            message.type === 'REJECTED'
                              ? 'bg-red-50 border-2 border-red-200 text-gray-900'
                              : message.type === 'SYSTEM'
                              ? 'bg-yellow-50 border-2 border-yellow-200 text-gray-900'
                              : isOwnMessage 
                              ? 'bg-black text-white' 
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            {message.type === 'REJECTED' && (
                              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-red-200">
                                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs font-semibold text-red-600">Rejection Reason</span>
                              </div>
                            )}
                            {message.type === 'SYSTEM' && (
                              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-yellow-200">
                                <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs font-semibold text-yellow-600">System Message</span>
                              </div>
                            )}
                            <p className="text-sm mb-1 break-words whitespace-pre-wrap">{message.message}</p>
                            <div className="flex justify-end">
                              <span className={`text-xs ${
                                message.type === 'REJECTED' 
                                  ? 'text-red-500'
                                  : message.type === 'SYSTEM'
                                  ? 'text-yellow-600'
                                  : isOwnMessage ? 'text-gray-300' : 'text-gray-500'
                              }`}>
                                {getTimeAgo(message.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-6 border-t border-gray-200">
                <form onSubmit={handleSendMessage}>
                  <div className="flex gap-2 items-end">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder="Type your message..."
                      maxLength={255}
                      rows={1}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl text-sm text-black focus:outline-none focus:border-gray-400 resize-none overflow-y-auto max-h-32"
                      disabled={isSendingMessage}
                    />
                    <button
                      type="submit"
                      disabled={isSendingMessage || !newMessage.trim()}
                      className="px-6 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSendingMessage ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-right">
                    {newMessage.length}/255 characters
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Reject Reason Modal */}
        {showRejectModal && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 p-4">
            <div className="bg-white rounded-3xl max-w-md w-full">
              <div className="p-6">
                {/* Header */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Reject Offer</h3>
                  <p className="text-sm text-gray-600 mt-1">Please provide a reason for rejecting this offer</p>
                </div>

                {/* Reason Input */}
                <div className="mb-6">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter your reason..."
                    maxLength={255}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-sm text-black focus:outline-none focus:border-gray-400 resize-none"
                    disabled={isRejecting}
                  />
                  <p className="text-xs text-gray-500 mt-2 text-right">
                    {rejectReason.length}/255 characters
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleRejectWithReason}
                    disabled={isRejecting || !rejectReason.trim()}
                    className="w-full bg-red-600 text-white py-3 rounded-full text-base font-medium hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectReason('');
                    }}
                    disabled={isRejecting}
                    className="w-full py-2 text-sm text-gray-700 hover:text-gray-900 font-medium cursor-pointer disabled:opacity-50"
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

  // Regular Mode - Single Column (Edit/Create Offer)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {isReopening ? 'Re-open offer' : existingOffer ? 'Edit offer' : 'Make an offer'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">{hospitalName}</p>
            </div>
            <button
              onClick={handleSubmitOffer}
              disabled={isSubmittingOffer}
              className="px-8 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmittingOffer ? 'Submitting...' : 'Confirm'}
            </button>
          </div>

          {/* Total Price */}
          <div className="mb-8 text-right">
            <p className="text-3xl font-bold text-gray-900">
              Total {calculateTotal().toFixed(2)} euro
            </p>
          </div>

          {/* Product List */}
          <div className="space-y-6 mb-6">
            {offerProducts.map((offerProduct, index) => {
              const priceWhole = Math.floor(offerProduct.sellerPrice);
              const priceCents = Math.round((offerProduct.sellerPrice - priceWhole) * 100);
              
              return (
                <div key={index} className="relative">
                  {offerProducts.length > 1 && (
                    <button
                      onClick={() => removeOfferProduct(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center text-sm cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{offerProduct.productName}</p>
                    <p className="text-sm text-gray-600 mb-3">
                      Seller price: {priceWhole}
                      <sup className="text-xs">{String(priceCents).padStart(2, '0')}</sup> {offerProduct.currency} | Quantity available: {offerProduct.maxQuantity} | Unit: {offerProduct.unit}
                    </p>
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={offerProduct.offerPrice || ''}
                          onChange={(e) => updateOfferProduct(index, 'offerPrice', parseFloat(e.target.value) || 0)}
                          placeholder="0,00"
                          className="w-full px-4 py-3 border border-gray-300 rounded-full text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-600">
                          euro
                        </span>
                      </div>
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          min="0"
                          max={offerProduct.maxQuantity}
                          value={offerProduct.quantity || ''}
                          onChange={(e) => updateOfferProduct(index, 'quantity', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full px-4 py-3 border border-gray-300 rounded-full text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-600">
                          quantity
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add New Product Button */}
          <button
            onClick={() => setShowProductSelector(!showProductSelector)}
            className="w-auto px-6 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer mb-4"
          >
            Add a new product
          </button>

          {/* Product Selector Dropdown */}
          {showProductSelector && (
            <div className="mb-8 max-h-60 overflow-y-auto border border-gray-300 rounded-2xl">
              {availableProducts.length === 0 ? (
                <p className="p-4 text-sm text-gray-600">Loading products...</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {availableProducts
                    .filter(p => !offerProducts.some(op => op.productId.toString() === p.id.toString()))
                    .map((availableProduct) => {
                      const priceWhole = Math.floor(availableProduct.price);
                      const priceCents = Math.round((availableProduct.price - priceWhole) * 100);
                      
                      return (
                        <button
                          key={availableProduct.id}
                          onClick={() => handleAddProduct(availableProduct)}
                          className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                        >
                          <p className="font-medium text-gray-900 mb-1">{availableProduct.name}</p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Code: {availableProduct.code}</span>
                            <span className="text-gray-900">
                              {priceWhole}
                              <sup className="text-xs">{String(priceCents).padStart(2, '0')}</sup> {availableProduct.currency}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Available: {availableProduct.quantity} {availableProduct.unit}
                          </p>
                        </button>
                      );
                    })}
                  {availableProducts.filter(p => !offerProducts.some(op => op.productId.toString() === p.id.toString())).length === 0 && (
                    <p className="p-4 text-sm text-gray-600">All products from this seller are already in your offer</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Message Textarea */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">Add a message</label>
            <textarea
              value={offerMessage}
              onChange={(e) => setOfferMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-sm focus:outline-none focus:border-gray-400 resize-none"
            />
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="mt-6 text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

