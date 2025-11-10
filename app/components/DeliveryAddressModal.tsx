'use client';

import { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/api';

interface DeliveryAddressDto {
  id: number;
  hospitalId: number;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

interface DeliveryAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitalId: number;
  onAddressSelected?: (address: DeliveryAddressDto) => void;
}

export default function DeliveryAddressModal({
  isOpen,
  onClose,
  hospitalId,
  onAddressSelected
}: DeliveryAddressModalProps) {
  const [addresses, setAddresses] = useState<DeliveryAddressDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DeliveryAddressDto | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    streetAddress: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    isDefault: false
  });

  useEffect(() => {
    if (isOpen) {
      fetchAddresses();
    }
  }, [isOpen]);

  const fetchAddresses = async () => {
    try {
      setIsLoading(true);
      const response = await authenticatedFetch(`/api/hospitals/${hospitalId}/delivery-addresses`);
      
      if (response.ok) {
        const data = await response.json();
        setAddresses(data);
      } else if (response.status !== 404) {
        throw new Error('Failed to fetch addresses');
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!formData.streetAddress || !formData.city || !formData.postalCode || !formData.country) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsSaving(true);
      const response = await authenticatedFetch(`/api/hospitals/${hospitalId}/delivery-addresses`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('Address added successfully');
        resetForm();
        fetchAddresses();
        setShowAddForm(false);
      } else {
        throw new Error('Failed to add address');
      }
    } catch (error) {
      console.error('Error adding address:', error);
      alert('Failed to add address. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAddress = async () => {
    if (!editingAddress) return;
    
    if (!formData.streetAddress || !formData.city || !formData.postalCode || !formData.country) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsSaving(true);
      const response = await authenticatedFetch(
        `/api/hospitals/${hospitalId}/delivery-addresses/${editingAddress.id}`,
        {
          method: 'PUT',
          body: JSON.stringify(formData)
        }
      );

      if (response.ok) {
        alert('Address updated successfully');
        resetForm();
        fetchAddresses();
        setEditingAddress(null);
      } else {
        throw new Error('Failed to update address');
      }
    } catch (error) {
      console.error('Error updating address:', error);
      alert('Failed to update address. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const response = await authenticatedFetch(
        `/api/hospitals/${hospitalId}/delivery-addresses/${addressId}`,
        {
          method: 'DELETE'
        }
      );

      if (response.ok || response.status === 204) {
        alert('Address deleted successfully');
        fetchAddresses();
      } else {
        throw new Error('Failed to delete address');
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      alert('Failed to delete address. Please try again.');
    }
  };

  const startEdit = (address: DeliveryAddressDto) => {
    setEditingAddress(address);
    setFormData({
      streetAddress: address.streetAddress,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault
    });
    setShowAddForm(false);
  };

  const resetForm = () => {
    setFormData({
      streetAddress: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      isDefault: false
    });
    setShowAddForm(false);
    setEditingAddress(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Delivery Addresses</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-300 hover:text-gray-800 cursor-pointer transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Address List or Form */}
          {showAddForm || editingAddress ? (
            /* Add/Edit Form */
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </h3>
              
              <div>
                <label className="block text-sm text-gray-700 mb-2">Street Address *</label>
                <input
                  type="text"
                  value={formData.streetAddress}
                  onChange={(e) => setFormData({...formData, streetAddress: e.target.value})}
                  placeholder="123 Main Street"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">City *</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="City"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">State/Province</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    placeholder="State"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Postal Code *</label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                    placeholder="12345"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Country *</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    placeholder="Country"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({...formData, isDefault: e.target.checked})}
                  className="w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-700 cursor-pointer">
                  Set as default address
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={editingAddress ? handleUpdateAddress : handleAddAddress}
                  disabled={isSaving}
                  className="flex-1 bg-black text-white py-3 rounded-full hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingAddress ? 'Update Address' : 'Add Address'}
                </button>
                <button
                  onClick={resetForm}
                  className="flex-1 bg-secondary text-gray-900 py-3 rounded-full hover:bg-secondary-2 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Address List */
            <>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading addresses...</p>
                  </div>
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No delivery addresses saved yet</p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-6 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    Add New Address
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        className={`p-4 rounded-2xl border-2 transition-colors cursor-pointer hover:border-gray-400 ${
                          address.isDefault 
                            ? 'border-gray-900 bg-gray-50' 
                            : 'border-gray-200 bg-white'
                        }`}
                        onClick={() => {
                          if (onAddressSelected) {
                            onAddressSelected(address);
                            onClose();
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {address.isDefault && (
                              <span className="inline-block px-2 py-1 bg-gray-900 text-white text-xs rounded-full mb-2">
                                Default
                              </span>
                            )}
                            <p className="text-base text-gray-900 font-medium">{address.streetAddress}</p>
                            <p className="text-sm text-gray-600">
                              {address.city}{address.state ? `, ${address.state}` : ''} {address.postalCode}
                            </p>
                            <p className="text-sm text-gray-600">{address.country}</p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(address);
                              }}
                              className="px-3 py-1 text-xs text-gray-700 hover:text-gray-900 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAddress(address.id);
                              }}
                              className="px-3 py-1 text-xs text-red-600 hover:text-red-700 border border-red-300 rounded-full hover:bg-red-50 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {addresses.length < 5 && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="w-full py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      Add New Address
                    </button>
                  )}
                  {addresses.length >= 5 && (
                    <p className="text-sm text-gray-600 text-center">Maximum of 5 addresses reached</p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

