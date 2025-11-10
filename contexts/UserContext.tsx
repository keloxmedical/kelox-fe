'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { BACKEND_API } from '@/config/api';

interface HospitalProfile {
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
  id: number;
  name: string;
  manufacturer: string;
  code: string;
  lotNumber: string;
  expiryDate: string;
  description: string;
  price: number;
  quantity: number;
  unit: string;
  sellerHospitalId: number;
  sellerHospitalName: string;
}

interface ShopItemDto {
  id: number;
  product: ProductResponse;
  quantity: number;
  price: number;
  type: string;
  offerId: string | null;
}

interface ShoppingCartResponse {
  id: string;
  hospitalId: number;
  hospitalName: string;
  items: ShopItemDto[];
  createdAt: string;
  updatedAt: string;
  totalItems: number;
  totalAmount: number;
}

interface UserContextType {
  jwtToken: string | null;
  hospitalProfile: HospitalProfile | null;
  shoppingCart: ShoppingCartResponse | null;
  isLoadingProfile: boolean;
  isLoadingCart: boolean;
  setJwtToken: (token: string | null) => void;
  setHospitalProfile: (profile: HospitalProfile | null) => void;
  fetchHospitalProfile: (token?: string) => Promise<HospitalProfile | null>;
  fetchShoppingCart: () => Promise<void>;
  clearUserData: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user } = usePrivy();
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [hospitalProfile, setHospitalProfile] = useState<HospitalProfile | null>(null);
  const [shoppingCart, setShoppingCart] = useState<ShoppingCartResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingCart, setIsLoadingCart] = useState(false);

  // Function to fetch hospital profile using JWT
  const fetchHospitalProfile = async (token?: string): Promise<HospitalProfile | null> => {
    const authToken = token || jwtToken;
    
    if (!authToken) {
      console.log('No JWT token available for fetching profile');
      return null;
    }

    try {
      setIsLoadingProfile(true);
      console.log('Fetching hospital profile...');
      
      const response = await fetch(`${BACKEND_API}/api/hospitals/my-profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // User doesn't own a hospital
          console.log('User does not own a hospital (404)');
          setHospitalProfile(null);
          return null;
        }
        throw new Error(`Failed to fetch hospital profile: ${response.statusText}`);
      }

      const profile = await response.json();
      console.log('Hospital profile fetched:', profile);
      setHospitalProfile(profile);
      
      // Fetch shopping cart after getting hospital profile
      await fetchShoppingCartInternal(profile.id, authToken);
      
      return profile;
    } catch (error) {
      console.error('Error fetching hospital profile:', error);
      setHospitalProfile(null);
      return null;
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Internal function to fetch shopping cart
  const fetchShoppingCartInternal = async (hospitalId: number, authToken: string) => {
    try {
      setIsLoadingCart(true);
      console.log('Fetching shopping cart for hospital:', hospitalId);
      
      const response = await fetch(`${BACKEND_API}/api/shop/hospitals/${hospitalId}/cart`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Empty cart or not found
          console.log('Shopping cart is empty or not found');
          setShoppingCart(null);
          return;
        }
        throw new Error(`Failed to fetch shopping cart: ${response.statusText}`);
      }

      const cart = await response.json();
      console.log('Shopping cart fetched:', cart);
      setShoppingCart(cart);
    } catch (error) {
      console.error('Error fetching shopping cart:', error);
      setShoppingCart(null);
    } finally {
      setIsLoadingCart(false);
    }
  };

  // Public function to refresh shopping cart
  const fetchShoppingCart = async () => {
    if (!hospitalProfile || !jwtToken) {
      console.log('Cannot fetch shopping cart without hospital profile and JWT token');
      return;
    }
    
    await fetchShoppingCartInternal(hospitalProfile.id, jwtToken);
  };

  // Clear all user data
  const clearUserData = () => {
    setJwtToken(null);
    setHospitalProfile(null);
    setShoppingCart(null);
    localStorage.removeItem('kelox_jwt_token');
  };

  // Load JWT token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('kelox_jwt_token');
    
    if (storedToken) {
      setJwtToken(storedToken);
      console.log('JWT token loaded from localStorage');
      // Fetch hospital profile with stored token
      fetchHospitalProfile(storedToken);
    }
  }, []);

  // Update localStorage when JWT token changes
  useEffect(() => {
    if (jwtToken) {
      localStorage.setItem('kelox_jwt_token', jwtToken);
    } else {
      localStorage.removeItem('kelox_jwt_token');
    }
  }, [jwtToken]);

  return (
    <UserContext.Provider
      value={{
        jwtToken,
        hospitalProfile,
        shoppingCart,
        isLoadingProfile,
        isLoadingCart,
        setJwtToken,
        setHospitalProfile,
        fetchHospitalProfile,
        fetchShoppingCart,
        clearUserData,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

