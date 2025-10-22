'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePrivy } from '@privy-io/react-auth';

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

interface UserContextType {
  jwtToken: string | null;
  hospitalProfile: HospitalProfile | null;
  isLoadingProfile: boolean;
  setJwtToken: (token: string | null) => void;
  setHospitalProfile: (profile: HospitalProfile | null) => void;
  fetchHospitalProfile: (token?: string) => Promise<HospitalProfile | null>;
  clearUserData: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user } = usePrivy();
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [hospitalProfile, setHospitalProfile] = useState<HospitalProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

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
      
      const response = await fetch('http://localhost:8080/api/hospitals/my-profile', {
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
      return profile;
    } catch (error) {
      console.error('Error fetching hospital profile:', error);
      setHospitalProfile(null);
      return null;
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Clear all user data
  const clearUserData = () => {
    setJwtToken(null);
    setHospitalProfile(null);
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
        isLoadingProfile,
        setJwtToken,
        setHospitalProfile,
        fetchHospitalProfile,
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

