# Testing the XMTP Chat Application

## Test Scenarios

### 1. User Mode Testing

1. **Connect Wallet**

   - Open the application in your browser
   - Click on a wallet connector (MetaMask, etc.)
   - Verify wallet connection is successful
   - Check that the wallet address is displayed

2. **Initialize XMTP Client**

   - Wait for "Initializing XMTP client..." to complete
   - Verify no error messages appear
   - Check that the conversation setup begins

3. **Send Messages**
   - Type a test message
   - Press Enter or click Send
   - Verify message appears in the chat
   - Check that message shows "You" as sender

### 2. Admin Mode Testing

1. **Switch to Admin Mode**

   - Click "Admin Mode" in the role switcher
   - Verify the admin interface loads
   - Check that the sidebar shows "Admin Panel"

2. **Add User Conversations**

   - Enter a user address in the input field
   - Click "Add" button
   - Verify the conversation appears in the sidebar
   - Click on the conversation to open it

3. **Send Admin Messages**
   - Type a response message
   - Press Enter or click Send
   - Verify message appears in the chat
   - Check that message shows "Admin" as sender

### 3. Cross-User Testing

1. **Open Two Browser Windows**

   - One as User Mode
   - One as Admin Mode

2. **Test Message Flow**
   - Send message from User Mode
   - Switch to Admin Mode
   - Verify message appears in admin interface
   - Send response from Admin Mode
   - Switch back to User Mode
   - Verify response appears in user interface

## Expected Behavior

- Messages should appear in real-time
- No duplicate messages should be shown
- Error messages should be user-friendly
- UI should be responsive and intuitive
- Wallet connection should persist across page refreshes

## Common Issues

1. **Wallet Not Connecting**

   - Check if wallet extension is installed
   - Ensure wallet is unlocked
   - Try refreshing the page

2. **XMTP Client Not Initializing**

   - Check network connection
   - Verify wallet is connected to correct network
   - Check browser console for errors

3. **Messages Not Sending**

   - Ensure wallet has sufficient ETH for gas
   - Check if XMTP client is properly initialized
   - Verify conversation is established

4. **Admin Interface Not Loading**
   - Ensure you're in Admin Mode
   - Check if wallet is connected
   - Verify XMTP client is initialized

## Debug Information

- Open browser developer tools (F12)
- Check the Console tab for error messages
- Check the Network tab for failed requests
- Verify wallet connection in the wallet extension
