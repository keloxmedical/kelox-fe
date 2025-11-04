'use client';

import { useState, useEffect } from 'react';
import { authenticatedFetch, BACKEND_API } from '@/lib/api';

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

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProduct?: ProductDetails;
  existingOffer?: ExistingOffer | null;
  hospitalId: number;
  hospitalName: string;
  onSuccess?: () => void;
}

export default function OfferModal({
  isOpen,
  onClose,
  initialProduct,
  existingOffer,
  hospitalId,
  hospitalName,
  onSuccess
}: OfferModalProps) {
  const [offerProducts, setOfferProducts] = useState<OfferProduct[]>([]);
  const [availableProducts, setAvailableProducts] = useState<ProductDetails[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [offerMessage, setOfferMessage] = useState('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);

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

      const endpoint = existingOffer ? `/api/offers/${existingOffer.id}` : '/api/offers';
      const method = existingOffer ? 'PUT' : 'POST';

      const response = await authenticatedFetch(endpoint, {
        method: method,
        body: JSON.stringify(offerData)
      });

      if (response.ok) {
        alert(existingOffer ? 'Offer updated successfully!' : 'Offer submitted successfully!');
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
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {existingOffer ? 'Edit offer' : 'Make an offer'}
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

