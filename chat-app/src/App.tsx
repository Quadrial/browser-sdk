import { useState, useEffect, useRef } from "react";
import {
  Client,
  Dm,
  DecodedMessage,
  type Identifier,
  type IdentifierKind,
} from "@xmtp/browser-sdk";
import WalletConnector from "./components/WalletConnector";
import AdminInterface from "./components/AdminInterface";
import { type WalletClient } from "viem";
import { createWalletSigner } from "./utils/walletSigner";

// Hardcoded admin address
const ADMIN_ADDRESS = "0x1dcb5a1c5fa7571860926ff8f09ea959c49d3461";

function App() {
  const [client, setClient] = useState<Client | null>(null);
  const [conversation, setConversation] = useState<Dm | null>(null);
  const [messages, setMessages] = useState<DecodedMessage[]>([]);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const onConnect = async (walletClient: WalletClient) => {
    setWalletClient(walletClient);

    // Check if the connected wallet is the admin
    const accounts = await walletClient.getAddresses();
    const connectedAddress = accounts[0]?.toLowerCase();
    const adminAddress = ADMIN_ADDRESS.toLowerCase();

    console.log("Connected address:", connectedAddress);
    console.log("Admin address:", adminAddress);
    console.log("Is admin:", connectedAddress === adminAddress);

    setIsAdmin(connectedAddress === adminAddress);
  };

  const retryConnection = async () => {
    if (!walletClient) return;

    setIsRetrying(true);
    setError(null);
    setClient(null);

    try {
      console.log("Retrying XMTP client initialization...");
      const signer = createWalletSigner(walletClient);

      // Try with simplified approach on retry
      const xmtpClient = await Client.create(signer, {
        env: "production",
        loggingLevel: "debug",
        dbPath: null,
      });
      console.log("XMTP client created successfully on retry:", xmtpClient);
      setClient(xmtpClient);
    } catch (err) {
      console.error("Failed to initialize XMTP client on retry:", err);
      setError(
        `Failed to initialize XMTP client: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setIsRetrying(false);
    }
  };

  // Initialize XMTP client when wallet is connected
  useEffect(() => {
    const initClient = async () => {
      if (walletClient && !client) {
        try {
          setError(null);
          console.log("Creating wallet signer...");
          const signer = createWalletSigner(walletClient);
          console.log("Wallet signer created, initializing XMTP client...");

          // Create XMTP client with simplified approach
          console.log("Creating XMTP client...");
          const xmtpClient = await Client.create(signer, {
            env: "production",
            loggingLevel: "debug",
            dbPath: null,
          });

          console.log("XMTP client created successfully:", xmtpClient);
          setClient(xmtpClient);
        } catch (err) {
          console.error("Failed to initialize XMTP client:", err);
          setError(
            `Failed to initialize XMTP client: ${
              err instanceof Error ? err.message : "Unknown error"
            }`
          );
        }
      }
    };

    initClient();
  }, [walletClient, client]);

  // Initialize conversation with admin when client is ready
  useEffect(() => {
    const initConversation = async () => {
      if (client && !conversation && !isAdmin) {
        try {
          setError(null);
          console.log("Creating conversation with admin...");
          // Create identifier for admin
          const adminIdentifier: Identifier = {
            identifier: ADMIN_ADDRESS,
            identifierKind: "Ethereum" as IdentifierKind,
          };

          // Try to get existing conversation or create new one
          const dm = await client.conversations.newDmWithIdentifier(
            adminIdentifier
          );
          console.log("Conversation created successfully:", dm);
          setConversation(dm);
        } catch (err) {
          console.error("Failed to initialize conversation:", err);
          setError(
            `Failed to initialize conversation with admin: ${
              err instanceof Error ? err.message : "Unknown error"
            }`
          );
        }
      }
    };

    initConversation();
  }, [client, conversation, isAdmin]);

  // Load messages and listen for new messages when conversation is ready
  useEffect(() => {
    const loadMessages = async () => {
      if (conversation) {
        try {
          // Load existing messages
          const conversationMessages = await conversation.messages();
          setMessages(conversationMessages);

          // Scroll to bottom
          scrollToBottom();
        } catch (err) {
          console.error("Failed to load messages:", err);
          setError("Failed to load messages. Please try again.");
        }
      }
    };

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    loadMessages();
  }, [conversation]);

  // Listen for new messages
  useEffect(() => {
    if (!conversation) return;

    let isMounted = true;

    const listenForMessages = async () => {
      try {
        const stream = await conversation.stream();

        for await (const msg of stream) {
          if (!isMounted) break;

          // Update messages state with new message
          setMessages((prevMessages) => {
            // Check if message already exists to avoid duplicates
            if (prevMessages.some((m) => m.id === msg.id)) {
              return prevMessages;
            }

            const newMessages = [...prevMessages, msg];
            // Scroll to bottom when new message arrives
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
            return newMessages;
          });
        }
      } catch (err) {
        console.error("Error listening for messages:", err);
        if (isMounted) {
          setError("Error listening for messages. Please refresh the page.");
        }
      }
    };

    listenForMessages();

    return () => {
      isMounted = false;
    };
  }, [conversation]);

  // Send a message
  const sendMessage = async () => {
    if (!conversation || !message.trim() || isSending) return;

    try {
      setIsSending(true);
      setError(null);

      // Send the message
      await conversation.send(message);

      // Clear the input
      setMessage("");

      // Reload messages to show the new one
      if (conversation) {
        const conversationMessages = await conversation.messages();
        setMessages(conversationMessages);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 px-4 py-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-center">
          {isAdmin ? "Admin Dashboard" : "XMTP Support Chat"}
        </h1>
        {walletClient && (
          <div className="text-center mt-2">
            <p className="text-sm text-gray-400">
              Wallet Connected: {walletClient.account?.address?.slice(0, 6)}...
              {walletClient.account?.address?.slice(-4)}
            </p>
            {isAdmin && (
              <p className="text-xs text-blue-400 mt-1">Admin Mode</p>
            )}
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-4 py-4">
        {!walletClient ? (
          <div className="flex-1 flex items-center justify-center">
            <WalletConnector onConnect={onConnect} />
          </div>
        ) : !client ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              {!error ? (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p>Initializing XMTP client...</p>
                  <p className="text-sm text-gray-400 mt-2">
                    This may take a few moments
                  </p>
                </>
              ) : (
                <>
                  <div className="text-red-500 text-6xl mb-4">⚠️</div>
                  <p className="text-lg mb-2">Connection Failed</p>
                  <p className="text-sm text-gray-400 mb-4">
                    Unable to initialize XMTP client
                  </p>
                </>
              )}
              {error && (
                <div className="mt-4 p-3 bg-red-500 text-white rounded-lg max-w-md mb-4">
                  {error}
                </div>
              )}
              {error && (
                <button
                  onClick={retryConnection}
                  disabled={isRetrying}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRetrying ? "Retrying..." : "Retry Connection"}
                </button>
              )}
            </div>
          </div>
        ) : isAdmin ? (
          <div className="flex-1 h-full">
            <AdminInterface client={client} />
          </div>
        ) : !conversation ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p>Setting up conversation with admin...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full">
            {/* Messages container */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 bg-gray-800 rounded-lg min-h-0">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg max-w-xs md:max-w-md lg:max-w-lg ${
                      msg.senderInboxId === client?.inboxId
                        ? "bg-blue-600 ml-auto"
                        : "bg-gray-700 mr-auto"
                    }`}
                  >
                    <p className="text-sm text-gray-300 mb-1">
                      {msg.senderInboxId === client?.inboxId ? "You" : "Admin"}
                    </p>
                    <p className="break-words">
                      {typeof msg.content === "function"
                        ? msg.content()
                        : msg.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(
                        Number(msg.sentAtNs / 1000000n)
                      ).toLocaleTimeString()}
                    </p>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500 text-white rounded-lg">
                {error}
              </div>
            )}

            {/* Message input */}
            <div className="flex gap-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 p-3 rounded-lg bg-gray-800 text-white resize-none border border-gray-600 focus:border-blue-500 focus:outline-none"
                rows={2}
                disabled={isSending}
              />
              <button
                onClick={sendMessage}
                disabled={!message.trim() || isSending}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  !message.trim() || isSending
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
