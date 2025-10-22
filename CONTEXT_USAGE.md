# UserContext Usage Guide

The Kelox app uses React Context to manage global user state, making it easy to access user data and hospital profile information from any component.

## Context Provider

The `UserProvider` is already set up in `app/layout.tsx` and wraps the entire application. You don't need to add it again.

## Using the Context

### Import the Hook

```typescript
import { useUser } from '@/contexts/UserContext';
```

### Available Values

```typescript
const { 
  jwtToken,              // string | null - JWT authentication token
  hospitalProfile,       // HospitalProfile | null - User's hospital data
  isLoadingProfile,      // boolean - Loading state for profile fetch
  setJwtToken,           // (token: string | null) => void
  setHospitalProfile,    // (profile: HospitalProfile | null) => void
  fetchHospitalProfile,  // (token?: string) => Promise<HospitalProfile | null>
  clearUserData          // () => void - Clear all user data and logout
} = useUser();
```

## Hospital Profile Type

```typescript
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
```

## Common Use Cases

### 1. Check if User Owns a Hospital

```typescript
import { useUser } from '@/contexts/UserContext';

function MyComponent() {
  const { hospitalProfile, isLoadingProfile } = useUser();

  if (isLoadingProfile) {
    return <div>Loading...</div>;
  }

  if (!hospitalProfile) {
    return <div>You don't own a hospital</div>;
  }

  return <div>Hospital: {hospitalProfile.name}</div>;
}
```

### 2. Make Authenticated API Requests

```typescript
import { useUser } from '@/contexts/UserContext';

function MyComponent() {
  const { jwtToken } = useUser();

  const fetchData = async () => {
    if (!jwtToken) return;

    const response = await fetch('http://localhost:8080/api/data', {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return data;
  };

  // ...
}
```

### 3. Display Hospital Information

```typescript
import { useUser } from '@/contexts/UserContext';

function HospitalHeader() {
  const { hospitalProfile } = useUser();

  return (
    <header>
      <h1>{hospitalProfile?.name}</h1>
      <p>{hospitalProfile?.address}</p>
      <p>{hospitalProfile?.companyName}</p>
    </header>
  );
}
```

### 4. Logout User

```typescript
import { useUser } from '@/contexts/UserContext';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';

function LogoutButton() {
  const { clearUserData } = useUser();
  const { logout } = usePrivy();
  const router = useRouter();

  const handleLogout = () => {
    clearUserData();  // Clear JWT and hospital profile
    logout();         // Logout from Privy
    router.push('/'); // Redirect to home
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

### 5. Manually Fetch Hospital Profile

```typescript
import { useUser } from '@/contexts/UserContext';

function RefreshButton() {
  const { fetchHospitalProfile, jwtToken } = useUser();

  const handleRefresh = async () => {
    if (!jwtToken) return;
    
    const profile = await fetchHospitalProfile();
    if (profile) {
      console.log('Profile refreshed:', profile);
    }
  };

  return <button onClick={handleRefresh}>Refresh Profile</button>;
}
```

### 6. Protected Route Pattern

```typescript
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';

function ProtectedPage() {
  const router = useRouter();
  const { jwtToken, hospitalProfile, isLoadingProfile } = useUser();

  useEffect(() => {
    if (!jwtToken) {
      router.push('/');
      return;
    }

    if (!isLoadingProfile && !hospitalProfile) {
      router.push('/');
    }
  }, [jwtToken, hospitalProfile, isLoadingProfile, router]);

  if (isLoadingProfile) {
    return <div>Loading...</div>;
  }

  if (!hospitalProfile) {
    return null; // Will redirect
  }

  return <div>Protected content</div>;
}
```

## Best Practices

1. **Always check loading state** before making decisions based on `hospitalProfile`
2. **Use `clearUserData()`** when logging out to properly clean up
3. **Don't store sensitive data** in the context - only IDs and non-sensitive info
4. **Re-fetch when needed** using `fetchHospitalProfile()` if data might be stale
5. **Handle null states** gracefully - profile can be null if user doesn't own a hospital

## Context Lifecycle

1. **On App Mount**: 
   - Context loads JWT token from localStorage
   - Automatically fetches hospital profile if token exists

2. **On Login**: 
   - Authentication page sets JWT token via `setJwtToken()`
   - Sets hospital profile from auth response via `setHospitalProfile()`

3. **On Page Navigation**: 
   - Context state persists across routes
   - Protected pages can immediately access data without refetching

4. **On Logout**: 
   - `clearUserData()` removes JWT from localStorage
   - Clears all context state

## Error Handling

The context handles common errors automatically:

- **404 on profile fetch**: Sets `hospitalProfile` to `null` (user doesn't own hospital)
- **401 on profile fetch**: Indicates invalid/expired token
- **Network errors**: Logs error and sets profile to `null`

You should handle UI feedback in your components based on these states.

