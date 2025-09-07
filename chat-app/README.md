# XMTP Support Chat Application

A web-based chat application built with XMTP (eXtensible Message Transport Protocol) that allows users to communicate with admins for support purposes.

## Features

- **User Mode**: Users can connect their wallet and start a conversation with an admin
- **Admin Mode**: Admins can manage multiple user conversations and respond to individual users
- **Real-time Messaging**: Messages are sent and received in real-time using XMTP
- **Wallet Integration**: Supports wallet connection via wagmi
- **Role Switching**: Easy switching between user and admin modes for testing

## Getting Started

### Prerequisites

- Node.js (version 20 or higher)
- A Web3 wallet (MetaMask, WalletConnect, etc.)
- XMTP client setup

### Installation

1. Navigate to the chat-app directory:

   ```bash
   cd chat-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

### As a User

1. Connect your wallet using the wallet connector
2. The application will automatically create a conversation with the admin
3. Start typing your message and press Enter or click Send
4. Wait for the admin to respond

### As an Admin

1. Connect your wallet
2. Switch to "Admin Mode" using the role switcher
3. Add user addresses to start conversations with them
4. Select conversations from the sidebar to view and respond to messages
5. Type responses and send them to individual users

## Technical Details

- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS
- **Web3 Integration**: wagmi for wallet connection
- **Messaging**: XMTP Browser SDK
- **Build Tool**: Vite

## Configuration

The application is configured to use the Sepolia testnet by default. You can modify the chain configuration in `src/main.tsx` if needed.

## Admin Address

The hardcoded admin address is set to `0x1dcb5a1c5fa7571860926ff8f09ea959c49d3461`. You can change this in `src/App.tsx` if needed.

## Troubleshooting

- Make sure your wallet is connected to the correct network
- Ensure you have some ETH for gas fees
- Check the browser console for any error messages
- Verify that XMTP is properly initialized

## Development

To build the application for production:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```
