'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignMessage } from '@privy-io/react-auth/solana';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import bs58 from 'bs58';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();
  const router = useRouter();
  const { 
    jwtToken, 
    hospitalProfile, 
    isLoadingProfile, 
    setJwtToken, 
    setHospitalProfile, 
    clearUserData 
  } = useUser();
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Redirect to marketplace if user has hospital profile
  useEffect(() => {
    if (hospitalProfile && !isLoadingProfile) {
      console.log('User owns a hospital, redirecting to marketplace...');
      router.push('/marketplace');
    }
  }, [hospitalProfile, isLoadingProfile, router]);

  // Backend authentication function
  const authenticateWithBackend = async () => {
    if (!user || !wallets || wallets.length === 0 || !signMessage) return;

    try {
      setIsAuthenticating(true);
      setAuthError(null);

      console.log('=== Starting Backend Authentication ===');

      // Get Solana wallet from wallets hook (useWallets from solana gives us Solana wallets only)
      const solanaWallet = wallets[0];
      
      if (!solanaWallet) {
        throw new Error('No Solana wallet found');
      }

      const solanaAddress = solanaWallet.address;

      // Get Ethereum wallet from user's linked accounts (if available)
      const ethereumWallet = user.linkedAccounts?.find(
        (account) => account.type === 'wallet' && (account as any).chainType === 'ethereum'
      );
      const ethereumAddress = ethereumWallet && 'address' in ethereumWallet ? ethereumWallet.address as string : undefined;

      // Create message to sign
      const message = 'Sign this message to authenticate with Kelox Medical';
      
      console.log('Signing message with Solana wallet...');
      console.log('Message:', message);
      console.log('Solana Wallet:', solanaAddress);
      console.log('Solana Wallet Object:', solanaWallet);

      // Sign the message with Solana wallet using Privy's useSignMessage hook
      const signatureResult = await signMessage({
        message: new TextEncoder().encode(message),
        wallet: solanaWallet,
        options: {
          uiOptions: {
            title: 'Sign Message',
            description: 'Sign this message to authenticate with Kelox Medical',
            buttonText: 'Sign'
          }
        }
      });

      // Encode signature to base58 (Solana standard)
      const signatureBase58 = bs58.encode(signatureResult.signature);

      console.log('Message signed successfully');
      console.log('Signature (Uint8Array):', signatureResult.signature);
      console.log('Signature (base58):', signatureBase58);

      // Prepare payload for backend
      const payload = {
        privyId: user.id,
        email: user.email?.address || '',
        solanaWallet: solanaAddress,
        ethereumWallet: ethereumAddress || null,
        message: message,
        signature: signatureBase58
      };

      console.log('Sending to backend:', payload);

      // Send to backend
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Backend authentication failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Backend response:', data);

      // Store JWT token
      if (data.token) {
        setJwtToken(data.token);
        console.log('JWT token stored successfully');
      }

      // Handle hospital profile from auth response
      if (data.hospitalProfile) {
        setHospitalProfile(data.hospitalProfile);
        console.log('Hospital profile received from auth:', data.hospitalProfile);
        // Redirect will happen via useEffect
      } else {
        // User doesn't own a hospital
        setHospitalProfile(null);
        console.log('User does not own a hospital');
      }

      console.log('=== Backend Authentication Complete ===');
    } catch (error) {
      console.error('Backend authentication error:', error);
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Console log user info and authenticate with backend
  useEffect(() => {
    if (authenticated && user && wallets && wallets.length > 0) {
      console.log('=== User Authenticated with Privy ===');
      console.log('Full User Object:', user);
      console.log('Email:', user.email?.address || 'No email');
      
      // Log all wallets from Solana wallets hook
      console.log('All Solana Wallets:', wallets);
      console.log('All Linked Accounts:', user.linkedAccounts);
      
      // Log Solana wallet (embedded wallet from Privy)
      const solanaWallet = wallets[0];
      console.log('Solana Wallet Address:', solanaWallet?.address || 'No Solana wallet');
      
      // Log Ethereum wallet (if available in linked accounts)
      const ethereumWallet = user.linkedAccounts?.find(
        (account) => account.type === 'wallet' && (account as any).chainType === 'ethereum'
      );
      console.log('Ethereum Wallet:', ethereumWallet && 'address' in ethereumWallet ? ethereumWallet.address : 'No Ethereum wallet');
      
      // Log other user info
      console.log('User ID:', user.id);
      console.log('Created At:', user.createdAt);
      console.log('Google Account:', user.google);
      console.log('Twitter Account:', user.twitter);
      console.log('Discord Account:', user.discord);
      console.log('========================');

      // Authenticate with backend only if we don't have a token yet
      if (!jwtToken) {
        authenticateWithBackend();
      }
    }
  }, [authenticated, user, wallets, jwtToken]);

  // if (!ready) {
  //   return (
  //     <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5]">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
  //         <p className="mt-4 text-gray-600">Loading...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5] p-4">
      <div className="w-full max-w-md">
        {/* Authentication Status */}
        {authenticated ? (
          <div className="text-center space-y-8">
            {/* Logo */}
            <div className="flex flex-col items-center space-y-6">
              <Image
                src="/keloxlogo.png"
                alt="Kelox Logo"
                width={120}
                height={120}
                priority
                className="object-contain"
              />
            </div>

            {/* Backend Authentication Status */}
            {(isAuthenticating || isLoadingProfile) && (
              <div className="bg-yellow-50 rounded-3xl p-4 shadow-sm">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                  <p className="text-sm text-yellow-800">
                    {isAuthenticating ? 'Authenticating with backend...' : 'Loading profile...'}
                  </p>
                </div>
              </div>
            )}

            {/* Authentication Error */}
            {authError && (
              <div className="bg-red-50 rounded-3xl p-4 shadow-sm">
                <p className="text-sm text-red-800">{authError}</p>
                <button
                  onClick={authenticateWithBackend}
                  className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                >
                  Retry
                </button>
              </div>
            )}

            {/* No Hospital Profile - Contact Team */}
            {jwtToken && !hospitalProfile && !isAuthenticating && !isLoadingProfile && (
              <div className="bg-yellow-50 rounded-3xl p-6 shadow-sm border-2 border-yellow-200">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="text-3xl">🏥</div>
                  <p className="text-base font-semibold text-yellow-900">
                    Account Setup Required
                  </p>
                  <p className="text-sm text-yellow-800">
                    Contact Kelox team to finish your account creation
                  </p>
                </div>
              </div>
            )}

            {/* User Info */}
            <div className="bg-white rounded-3xl p-6 shadow-sm">
              <p className="text-sm text-gray-600 mb-2">Logged in as</p>
              <p className="text-base font-medium text-black break-all">
                {user?.email?.address || user?.wallet?.address || 'User'}
              </p>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => {
                clearUserData();
                logout();
              }}
              className="w-full bg-black hover:bg-gray-800 text-white font-normal py-4 px-6 rounded-full transition-colors duration-200"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            {/* Logo */}
            <div className="flex flex-col items-center">
              <Image
                src="/keloxlogo.png"
                alt="Kelox Logo"
                width={300}
                height={300}
                priority
                className="object-contain"
              />
            </div>

            {/* Sign in text */}
            {/* <p className="text-base text-black font-normal">Sign in to your account</p> */}

            {/* Login Button */}
            <button
              disabled={true}
              onClick={login}
              className="w-full cursor-pointer bg-black hover:bg-gray-800 text-white font-normal py-4 px-6 rounded-full transition-colors duration-200"
            >
              Coming soon
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
