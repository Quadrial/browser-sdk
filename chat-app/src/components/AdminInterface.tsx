import { useState, useEffect, useRef } from "react";
import {
  Client,
  Dm,
  DecodedMessage,
  type Identifier,
  type IdentifierKind,
} from "@xmtp/browser-sdk";

interface AdminInterfaceProps {
  client: Client;
}

interface ConversationData {
  dm: Dm;
  messages: DecodedMessage[];
  userAddress: string;
  lastMessage?: DecodedMessage;
}

function AdminInterface({ client }: AdminInterfaceProps) {
  const [conversations, setConversations] = useState<
    Map<string, ConversationData>
  >(new Map());
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUserAddress, setNewUserAddress] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load all existing conversations
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const allConversations = await client.conversations.list();
        const conversationMap = new Map<string, ConversationData>();

        for (const conv of allConversations) {
          if (conv instanceof Dm) {
            const userAddress = await conv.peerInboxId();
            const messages = await conv.messages();
            const lastMessage = messages[messages.length - 1];

            conversationMap.set(userAddress, {
              dm: conv,
              messages,
              userAddress,
              lastMessage,
            });
          }
        }

        setConversations(conversationMap);
      } catch (err) {
        console.error("Failed to load conversations:", err);
        setError("Failed to load conversations");
      }
    };

    loadConversations();
  }, [client]);

  // Listen for new messages in all conversations
  useEffect(() => {
    if (!client) return;

    const listenForMessages = async () => {
      try {
        const stream = await client.conversations.stream();

        for await (const item of stream) {
          // Check if this is a message (DecodedMessage) by checking for required properties
          if (
            item &&
            typeof item === "object" &&
            "conversationId" in item &&
            "senderInboxId" in item &&
            "content" in item
          ) {
            const message = item as unknown as DecodedMessage;

            // Find the conversation this message belongs to
            const conversation = conversations.get(message.senderInboxId);
            if (conversation) {
              setConversations((prev) => {
                const newMap = new Map(prev);
                const existing = newMap.get(message.senderInboxId);

                if (existing) {
                  // Update existing conversation
                  const updatedMessages = [...existing.messages, message];
                  newMap.set(message.senderInboxId, {
                    ...existing,
                    messages: updatedMessages,
                    lastMessage: message,
                  });
                }

                return newMap;
              });
            }
          }
        }
      } catch (err) {
        console.error("Error listening for messages:", err);
        setError("Error listening for messages");
      }
    };

    listenForMessages();
  }, [client, conversations]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation, conversations]);

  const createConversationWithUser = async () => {
    if (!newUserAddress.trim()) return;

    try {
      setError(null);
      const identifier: Identifier = {
        identifier: newUserAddress,
        identifierKind: "Ethereum" as IdentifierKind,
      };

      const dm = await client.conversations.newDmWithIdentifier(identifier);
      const messages = await dm.messages();
      const userAddress = await dm.peerInboxId();

      setConversations((prev) => {
        const newMap = new Map(prev);
        newMap.set(userAddress, {
          dm,
          messages,
          userAddress,
        });
        return newMap;
      });

      setSelectedConversation(userAddress);
      setNewUserAddress("");
    } catch (err) {
      console.error("Failed to create conversation:", err);
      setError("Failed to create conversation with user");
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation || !message.trim() || isSending) return;

    const conversation = conversations.get(selectedConversation);
    if (!conversation) return;

    try {
      setIsSending(true);
      setError(null);

      await conversation.dm.send(message);
      setMessage("");

      // Refresh messages
      const updatedMessages = await conversation.dm.messages();
      setConversations((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(selectedConversation);
        if (existing) {
          newMap.set(selectedConversation, {
            ...existing,
            messages: updatedMessages,
            lastMessage: updatedMessages[updatedMessages.length - 1],
          });
        }
        return newMap;
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectedConv = selectedConversation
    ? conversations.get(selectedConversation)
    : null;

  return (
    <div className="flex h-full">
      {/* Sidebar with conversations */}
      <div className="w-1/3 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Admin Panel</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newUserAddress}
              onChange={(e) => setNewUserAddress(e.target.value)}
              placeholder="User address (0x...)"
              className="flex-1 p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={createConversationWithUser}
              disabled={!newUserAddress.trim()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {Array.from(conversations.values())
            .sort((a, b) => {
              if (!a.lastMessage && !b.lastMessage) return 0;
              if (!a.lastMessage) return 1;
              if (!b.lastMessage) return -1;
              return (
                Number(b.lastMessage.sentAtNs) - Number(a.lastMessage.sentAtNs)
              );
            })
            .map((conv) => (
              <div
                key={conv.userAddress}
                onClick={() => setSelectedConversation(conv.userAddress)}
                className={`p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-700 ${
                  selectedConversation === conv.userAddress ? "bg-gray-700" : ""
                }`}
              >
                <div className="font-medium text-sm">
                  {conv.userAddress.slice(0, 6)}...{conv.userAddress.slice(-4)}
                </div>
                {conv.lastMessage && (
                  <div className="text-xs text-gray-400 mt-1 truncate">
                    {typeof conv.lastMessage.content === "function"
                      ? conv.lastMessage.content()
                      : conv.lastMessage.content}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {conv.messages.length} message
                  {conv.messages.length !== 1 ? "s" : ""}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            <div className="p-4 border-b border-gray-700 bg-gray-800">
              <h3 className="font-semibold">
                Chat with {selectedConv.userAddress.slice(0, 6)}...
                {selectedConv.userAddress.slice(-4)}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedConv.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg max-w-xs md:max-w-md lg:max-w-lg ${
                    msg.senderInboxId === client?.inboxId
                      ? "bg-blue-600 ml-auto"
                      : "bg-gray-700 mr-auto"
                  }`}
                >
                  <p className="text-sm text-gray-300 mb-1">
                    {msg.senderInboxId === client?.inboxId ? "Admin" : "User"}
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
              ))}
              <div ref={messagesEndRef} />
            </div>

            {error && (
              <div className="mx-4 mb-4 p-3 bg-red-500 text-white rounded-lg">
                {error}
              </div>
            )}

            <div className="p-4 border-t border-gray-700">
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">Select a conversation</p>
              <p className="text-sm">
                Choose a user from the sidebar to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminInterface;
