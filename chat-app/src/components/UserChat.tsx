// src/components/UserChat.tsx
import { useState, useEffect, useRef } from "react";
import {
  Client,
  Dm,
  DecodedMessage,
  type Identifier,
  type IdentifierKind,
} from "@xmtp/browser-sdk";
import { type WalletClient } from "viem";
import { createWalletSigner } from "../utils/walletSigner"; // Adjust path if needed

// Hardcoded admin address
const ADMIN_ADDRESS = "0x1dcb5a1c5fa7571860926ff8f09ea959c49d3461";

// --- Helper: type check ---
const isDecodedMessage = (item: any): item is DecodedMessage => {
  return (
    item &&
    typeof item === "object" &&
    "id" in item &&
    "senderInboxId" in item &&
    "sentAtNs" in item &&
    "content" in item &&
    "conversation" in item &&
    item.conversation &&
    typeof item.conversation === "object" &&
    "id" in item.conversation
  );
};

// Helper function to safely render message content
const renderMessageContent = (content: any): string => {
  if (typeof content === "function") {
    try {
      return content();
    } catch (e) {
      console.error("Error rendering message content function:", e);
      return "[Error rendering content]";
    }
  } else if (typeof content === "string") {
    return content;
  } else if (typeof content === "object" && content !== null) {
    return JSON.stringify(content);
  }
  return String(content);
};

interface UserChatProps {
  walletClient: WalletClient;
  // We might need to pass theXMTP client if it's initialized in App,
  // or let this component initialize it. For simplicity, let's assume it initializes.
}

function UserChat({ walletClient }: UserChatProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [conversation, setConversation] = useState<Dm | null>(null);
  const [messages, setMessages] = useState<DecodedMessage[]>([]);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize XMTP client when wallet is connected
  useEffect(() => {
    const initClient = async () => {
      if (walletClient && !client) {
        try {
          setError(null);
          const signer = createWalletSigner(walletClient);
          const xmtpClient = await Client.create(signer, {
            env: "production",
            loggingLevel: "debug",
          });
          setClient(xmtpClient);
        } catch (err) {
          setError(
            `Failed to initialize XMTP client: ${
              err instanceof Error ? err.message : "Unknown error"
            }`
          );
        }
      }
    };

    initClient();
  }, [walletClient, client]); // Re-run if walletClient or client changes

  // Initialize conversation with admin when client is ready
  useEffect(() => {
    const initConversation = async () => {
      if (client && !conversation) {
        try {
          setError(null);
          // First, check if the admin is on the XMTP network
          const canMessageAdmin = await Client.canMessage(ADMIN_ADDRESS);
          if (!canMessageAdmin) {
            throw new Error(
              "Admin address not registered on XMTP network. Please contact support."
            );
          }

          const adminIdentifier: Identifier = {
            identifier: ADMIN_ADDRESS,
            identifierKind: "Ethereum" as IdentifierKind,
          };

          const dm = await client.conversations.newDmWithIdentifier(
            adminIdentifier
          );
          setConversation(dm);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to start conversation with admin"
          );
        }
      }
    };

    initConversation();
  }, [client, conversation]); // Re-run if client or conversation state changes

  // Load messages for the conversation
  useEffect(() => {
    const loadMessages = async () => {
      if (conversation) {
        try {
          const conversationMessages = await conversation.messages();
          setMessages(conversationMessages.filter(isDecodedMessage));
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
  }, [conversation]); // Re-run when conversation is set

  // Listen for new messages in the conversation
  useEffect(() => {
    if (!conversation) return;

    let isMounted = true;
    let stream: AsyncGenerator<any, void, unknown> | null = null;

    const listenForMessages = async () => {
      try {
        stream = await conversation.stream();

        for await (const msg of stream) {
          if (!isMounted) break;

          if (isDecodedMessage(msg)) {
            setMessages((prev) => {
              // Avoid duplicate messages
              if (prev.some((m) => m.id === msg.id)) {
                return prev;
              }
              return [...prev, msg];
            });

            // Scroll to bottom after new message arrives
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          } else {
            console.log("UserChat: Ignoring unknown stream item type:", msg);
          }
        }
      } catch (err) {
        console.error("Error listening for messages in UserChat:", err);
        if (isMounted) {
          setError("Error listening for messages. Please refresh the page.");
        }
      }
    };

    listenForMessages();

    // Cleanup function to stop the stream
    return () => {
      isMounted = false;
      if (stream && typeof stream.return === "function") {
        stream.return();
      }
    };
  }, [conversation]); // Re-run when conversation changes

  // Send a message
  const sendMessage = async () => {
    if (!conversation || !message.trim() || isSending) return;

    try {
      setIsSending(true);
      setError(null);

      await conversation.send(message);
      setMessage(""); // Clear input after sending

      // Refresh messages to show the sent message
      const conversationMessages = await conversation.messages();
      setMessages(conversationMessages.filter(isDecodedMessage));
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key press for sending messages
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-900 text-white">
      {!client ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            {!error ? (
              <>
                <div className="animate-spin h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4 rounded-full"></div>
                <p>Initializing XMTP client...</p>
              </>
            ) : (
              <>
                <p className="text-lg mb-2">Connection Failed</p>
                <div className="bg-red-500 p-2 rounded max-w-md mx-auto">
                  {error}
                </div>
                {/* Retry functionality might need walletClient passed down or managed in App */}
                <p className="text-sm text-gray-400 mt-2">
                  Please ensure your wallet is connected and try again.
                </p>
              </>
            )}
          </div>
        </div>
      ) : !conversation ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">
            {error ? error : "Setting up conversation with admin..."}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full">
          {/* Messages container */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 bg-gray-800 rounded-lg m-4">
            {" "}
            {/* Add margin for separation */}
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    msg.senderInboxId === client?.inboxId
                      ? "flex-row-reverse"
                      : ""
                  }`}
                >
                  {/* Avatar placeholder */}
                  <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold uppercase flex-shrink-0">
                    {msg.senderInboxId === client?.inboxId ? "You" : "Admin"}
                  </div>
                  <div
                    className={`p-3 rounded-lg max-w-sm md:max-w-md lg:max-w-lg shadow-md ${
                      msg.senderInboxId === client?.inboxId
                        ? "bg-blue-600 text-white" // Your message style
                        : "bg-gray-700 text-gray-200" // Admin message style
                    }`}
                  >
                    <p className="text-sm font-medium mb-1">
                      {msg.senderInboxId === client?.inboxId ? "You" : "Admin"}
                    </p>
                    <p className="break-words text-sm leading-relaxed">
                      {renderMessageContent(msg.content)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {new Date(
                        Number(msg.sentAtNs / 1000000n)
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error message */}
          {error && (
            <div className="mx-4 mb-4 p-3 bg-red-500 text-white rounded-lg">
              {error}
            </div>
          )}

          {/* Message input */}
          <div className="p-4 border-t border-gray-700 bg-gray-800">
            <div className="flex gap-2 items-end">
              {" "}
              {/* Align items to bottom */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 p-3 rounded-lg bg-gray-800 text-white resize-none border border-gray-600 focus:border-blue-500 focus:outline-none shadow-sm"
                rows={2}
                disabled={isSending}
                style={{ minHeight: "48px" }}
              />
              <button
                onClick={sendMessage}
                disabled={!message.trim() || isSending}
                className={`px-5 py-3 rounded-lg font-medium transition-colors shadow-sm flex-shrink-0 ${
                  !message.trim() || isSending
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserChat;
