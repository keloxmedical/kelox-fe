# Authentication Flow Documentation

## Overview

The Kelox frontend uses a two-step authentication process:
1. **Privy Authentication** - User signs in with email through Privy
2. **Backend Authentication** - Sign a message with Solana wallet and authenticate with Kelox backend

## Authentication Flow

### Step 1: Privy Sign In

When a user clicks "Sign in", Privy handles the authentication:
- Email verification
- Embedded Solana wallet creation (automatic)
- User account creation in Privy

### Step 2: Backend Authentication

After Privy authentication succeeds, the app automatically:

1. **Extracts wallet addresses**
   - Solana wallet (embedded wallet from Privy)
   - Ethereum wallet (if available)

2. **Signs a message**
   - Message: "Sign this message to authenticate with Kelox Medical"
   - Message is converted to Uint8Array using `TextEncoder`
   - Uses Privy's `useSignMessage` hook from `@privy-io/react-auth/solana`
   - Signed with the user's Solana embedded wallet
   - Raw signature (Uint8Array) is encoded to base58 using `bs58.encode()`
   - This produces a proper Solana signature (NOT Ethereum)

3. **Calls backend API**
   ```
   POST http://localhost:8080/api/auth/login
   
   Payload:
   {
     "privyId": "did:privy:abc123xyz",
     "email": "user@example.com",
     "solanaWallet": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
     "ethereumWallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
     "message": "Sign this message to authenticate with Kelox Medical",
     "signature": "base58_encoded_solana_signature"
   }
   ```

4. **Stores JWT token and handles response**
   - Backend returns a JWT token
   - Token is stored in localStorage as `kelox_jwt_token`
   - Token persists across page refreshes
   - Hospital profile is returned in the auth response (first login only)
   
5. **Handles user routing based on hospital profile**
   - If `hospitalProfile` exists in response: User owns a hospital → Redirect to `/marketplace`
   - If `hospitalProfile` is null: User doesn't own a hospital → Show message to contact Kelox team
   
6. **Fetching hospital profile on subsequent visits**
   - If JWT token exists in localStorage on page load
   - App automatically fetches hospital profile via `GET /api/hospitals/my-profile`
   - If 404: User doesn't own a hospital → Show contact message
   - If profile exists: Redirect to `/marketplace`

## UI States

### 1. Not Authenticated
- Shows Kelox logo and "Sign in" button
- User clicks to start Privy authentication

### 2. Authenticating with Backend
- Yellow notification: "Authenticating with backend..."
- Shows loading spinner

### 3. Backend Authentication Success - With Hospital
- Green notification: "✓ Backend authenticated"
- Automatically redirects to `/marketplace`
- Hospital profile stored in localStorage

### 4. Backend Authentication Success - Without Hospital
- Green notification: "✓ Backend authenticated"
- Yellow card: "Account Setup Required"
- Message: "Contact Kelox team to finish your account creation"
- Shows user email/wallet
- Logout option available

### 5. Backend Authentication Error
- Red notification with error message
- "Retry" button to attempt backend auth again

## Solana Signature Details

The signature sent to the backend is a proper Solana signature:
- Uses Privy's `useSignMessage` hook from `@privy-io/react-auth/solana`
- Message is encoded as UTF-8 bytes (Uint8Array) using `TextEncoder`
- Signed using the embedded Solana wallet via `signMessage({ message, wallet, options })`
- Signature (Uint8Array) is encoded to **base58** format using `bs58.encode()`
- **NOT an Ethereum signature** (no 0x prefix)

Example Solana signature format:
```
Base58 string: "3tF8h2k9vZ..." (typically 87-88 characters, base58 encoded)
```

Ethereum signatures (NOT used here) look like:
```
Hex string: "0xe64a71d052..." (130 characters with 0x prefix, base16/hex)
```

### Implementation
```typescript
import { useSignMessage } from '@privy-io/react-auth/solana';
import bs58 from 'bs58';

const { signMessage } = useSignMessage();

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

const signatureBase58 = bs58.encode(signatureResult.signature);
```

## Using the JWT Token

### Option 1: Using the utility functions

```typescript
import { authenticatedFetch } from '@/lib/api';

// Make an authenticated API request
const response = await authenticatedFetch('/api/user/profile');
const data = await response.json();

// POST request
const response = await authenticatedFetch('/api/data', {
  method: 'POST',
  body: JSON.stringify({ key: 'value' })
});
```

### Option 2: Manual token retrieval

```typescript
// Get token from localStorage
const token = localStorage.getItem('kelox_jwt_token');

// Use in fetch requests
fetch('http://localhost:8080/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## Backend Response Types

### User with Hospital
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "privyId": "did:privy:clxyz123abc",
  "email": "user@example.com",
  "solanaWallet": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "ethereumWallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
  "newUser": false,
  "hospitalProfile": {
    "id": 1,
    "name": "St. Mary's Medical Center",
    "address": "123 Healthcare Blvd",
    "companyName": "St. Mary's Healthcare",
    "ownerId": "550e8400-e29b-41d4-a716-446655440000",
    "ownerEmail": "user@example.com",
    "ownerSolanaWallet": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    "contacts": [...]
  }
}
```
→ **Action**: Redirect to `/marketplace`

### User without Hospital
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "privyId": "did:privy:clxyz123abc",
  "email": "user@example.com",
  "solanaWallet": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "ethereumWallet": null,
  "newUser": true,
  "hospitalProfile": null
}
```
→ **Action**: Show message to contact Kelox team

## Hospital Profile Fetching

### First-time Authentication
- Hospital profile is included in the `/api/auth/login` response
- Profile is stored in state (not localStorage)
- Used to determine if user should be redirected to marketplace

### Subsequent Visits
If JWT token exists in localStorage:
```typescript
GET http://localhost:8080/api/hospitals/my-profile
Headers: Authorization: Bearer {jwt_token}

Response:
- 200: Returns hospital profile object
- 404: User doesn't own a hospital
- 401: Invalid/expired token
```

The marketplace page also fetches the profile on mount to ensure it's protected.

## Sign Out Flow

When user clicks "Sign out":
1. JWT token is removed from localStorage
2. JWT and hospital state are cleared
3. Privy logout is called
4. User is returned to sign-in screen

## Console Logging

The app logs detailed information during authentication:

1. **Privy Authentication**
   - Full user object
   - Email address
   - All wallet addresses
   - User ID and metadata

2. **Backend Authentication**
   - Message to be signed
   - Solana wallet address
   - Generated signature
   - Payload sent to backend
   - Backend response
   - JWT token storage confirmation

## Error Handling

Common errors and solutions:

### "No Solana wallet found"
- User's Privy account doesn't have an embedded wallet
- Check Privy configuration for embedded wallet creation

### "Backend authentication failed"
- Backend server not running
- Backend unable to verify signature
- Network connectivity issues

### Token expiration
- JWT tokens have an expiration time set by the backend
- App should handle 401 responses and re-authenticate

## Configuration

### Backend API URL

Set in environment variables:

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Default: `http://localhost:8080`

### Authentication Message

To change the message that users sign, update in `app/page.tsx`:

```typescript
const message = 'Sign this message to authenticate with Kelox Medical';
```

## Security Considerations

1. **JWT Token Storage**
   - Stored in localStorage (accessible to JavaScript)
   - Consider using httpOnly cookies for production

2. **Message Signing**
   - Message is constant (no nonce/timestamp)
   - Backend should validate signature matches wallet address
   - Consider adding timestamp/nonce for replay protection

3. **HTTPS**
   - Always use HTTPS in production
   - Protects token during transmission

4. **Token Expiration**
   - Implement token refresh mechanism
   - Handle expired tokens gracefully

