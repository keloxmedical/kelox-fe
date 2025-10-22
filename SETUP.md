# Setup Instructions

## Quick Start

### 1. Create Environment File

Create a `.env.local` file in the root directory with your Privy App ID:

```bash
# .env.local
NEXT_PUBLIC_PRIVY_APP_ID=your_actual_privy_app_id_here
```

### 2. Get Your Privy App ID

1. Visit [Privy Dashboard](https://dashboard.privy.io)
2. Sign up or log in
3. Create a new app or select an existing one
4. Copy your App ID from the dashboard
5. Paste it into your `.env.local` file

### 3. Configure Privy App Settings (Optional)

In your Privy Dashboard, you can configure:

- **Allowed domains**: Add `localhost:3000` for development
- **Login methods**: Enable/disable specific authentication methods
- **Branding**: Customize the authentication modal appearance
- **Webhook URLs**: Set up webhooks for authentication events

### 4. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your authentication page.

## Troubleshooting

### "Invalid App ID" Error

- Make sure your `.env.local` file exists and contains the correct Privy App ID
- Restart the development server after creating/updating `.env.local`
- Verify your App ID in the Privy Dashboard

### Authentication Modal Not Opening

- Check browser console for errors
- Ensure all Privy packages are installed correctly
- Try clearing browser cache and cookies

### Wallet Connection Issues

- Make sure you have a wallet extension installed (MetaMask, WalletConnect, etc.)
- Check that the wallet extension is unlocked
- Verify that the wallet is connected to the correct network

## Next Steps

After successful authentication setup, you can:

1. Add protected routes and pages
2. Implement role-based access control
3. Customize the authentication UI
4. Add wallet interaction features
5. Integrate with your backend API

## Need Help?

- [Privy Documentation](https://docs.privy.io)
- [Next.js Documentation](https://nextjs.org/docs)
- [GitHub Issues](https://github.com/yourusername/kelox-fe/issues)

