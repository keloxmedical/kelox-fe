# Kelox Frontend

A modern Next.js 15+ application with Privy authentication integration.

## Features

- ✨ Next.js 15+ with App Router
- 🔐 Privy Authentication (Email authentication)
- 🔑 Backend JWT authentication with Solana wallet signature
- 🎨 Tailwind CSS for styling
- 💎 TypeScript for type safety
- 💼 Embedded Solana Wallets (auto-created by Privy)
- 🔒 Secure message signing for backend authentication

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm or yarn

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

3. Get your Privy App ID:

- Go to [Privy Dashboard](https://dashboard.privy.io)
- Create a new app or use an existing one
- Copy your App ID
- Add it to `.env.local`:

```env
NEXT_PUBLIC_PRIVY_APP_ID=your_actual_privy_app_id
NEXT_PUBLIC_API_URL=http://localhost:8080
```

4. Ensure your backend server is running on `http://localhost:8080` (or update the URL in `.env.local`)

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the authentication page.

## Project Structure

```
kelox-fe/
├── app/
│   ├── layout.tsx          # Root layout with Privy and User providers
│   ├── page.tsx            # Authentication page with backend auth
│   ├── providers.tsx       # Privy configuration
│   ├── globals.css         # Global styles
│   └── marketplace/
│       └── page.tsx        # Marketplace page (hospital owners only)
├── contexts/
│   └── UserContext.tsx     # Global user and hospital profile state
├── lib/
│   └── api.ts              # API utilities for authenticated requests
├── public/
│   └── keloxlogo.png       # Kelox logo
├── .env.example            # Environment variables template
├── AUTH_FLOW.md            # Detailed authentication flow documentation
└── README.md               # This file
```

## Authentication Flow

The app uses a two-step authentication process:

### Step 1: Privy Authentication
1. User clicks "Sign in" button
2. Privy modal opens for email authentication
3. User verifies their email
4. Privy creates an embedded Solana wallet automatically

### Step 2: Backend Authentication (Automatic)
1. App extracts the Solana wallet address from Privy
2. Signs a message: "Sign this message to authenticate with Kelox Medical"
3. Sends POST request to `http://localhost:8080/api/auth/login` with:
   - Privy User ID
   - Email address
   - Solana wallet address
   - Ethereum wallet (if available)
   - Signed message and signature
4. Backend verifies the signature and returns a JWT token
5. JWT token is stored in localStorage for future API calls

### Step 3: User Routing
- **If user owns a hospital**: Automatically redirected to `/marketplace`
- **If user doesn't own a hospital**: Message shown: "Contact Kelox team to finish your account creation"

See [AUTH_FLOW.md](./AUTH_FLOW.md) for detailed documentation.

## User Context

The app uses React Context to manage global user state:

```typescript
import { useUser } from '@/contexts/UserContext';

function MyComponent() {
  const { 
    jwtToken,              // JWT token string
    hospitalProfile,       // Hospital profile object (or null)
    isLoadingProfile,      // Loading state
    setJwtToken,           // Update JWT token
    setHospitalProfile,    // Update hospital profile
    fetchHospitalProfile,  // Fetch profile from API
    clearUserData          // Clear all user data
  } = useUser();

  // Use the data...
}
```

## Using the JWT Token

After authentication, use the JWT token for API requests:

```typescript
import { authenticatedFetch } from '@/lib/api';

// GET request
const response = await authenticatedFetch('/api/user/profile');
const data = await response.json();

// POST request
const response = await authenticatedFetch('/api/data', {
  method: 'POST',
  body: JSON.stringify({ key: 'value' })
});
```

Or access directly from context:

```typescript
import { useUser } from '@/contexts/UserContext';

const { jwtToken } = useUser();
fetch('http://localhost:8080/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
  }
});
```

## Privy Configuration

The Privy provider is configured in `app/providers.tsx` with the following options:

- **Login Methods**: Email only (configurable)
- **Theme**: Light mode with custom accent color (#676FFF)
- **Embedded Wallets**: Automatically created for users without wallets

You can customize these settings in the `app/providers.tsx` file.

## Backend API Requirements

Your backend should have an endpoint:

```
POST /api/auth/login

Body:
{
  "privyId": "did:privy:abc123xyz",
  "email": "user@example.com",
  "solanaWallet": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "ethereumWallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7" | null,
  "message": "Sign this message to authenticate with Kelox Medical",
  "signature": "base58_encoded_solana_signature"
}

**Note**: The signature is in base58 format (Solana standard), NOT base64 or hex.
To verify the signature, decode it from base58 first.

Response:
{
  "token": "jwt_token_here",
  ...other fields
}
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Privy Documentation](https://docs.privy.io)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## License

MIT
