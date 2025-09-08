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

// Helper to render message content safely
const renderMessageContent = (content: any): string => {
  if (typeof content === "string") return content;
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
};

const isDecodedMessage = (item: any): item is DecodedMessage => {
  return (
    item &&
    typeof item === "object" &&
    "id" in item &&
    "senderInboxId" in item &&
    "sentAtNs" in item &&
    "content" in item
  );
};

function AdminInterface({ client }: AdminInterfaceProps) {
  const [conversations, setConversations] = useState<
    Map<string, ConversationData>
  >(new Map());
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUserAddress, setNewUserAddress] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial load + start streaming each conversation
  useEffect(() => {
    let alive = true;

    const setup = async () => {
      try {
        const all = await client.conversations.list();

        for (const conv of all) {
          if (!(conv instanceof Dm)) continue;
          const peer = await conv.peerInboxId();
          const initialMessages = (await conv.messages()).filter(
            isDecodedMessage
          );

          // add to state
          setConversations((prev) => {
            const newMap = new Map(prev);
            newMap.set(conv.id, {
              dm: conv,
              messages: initialMessages,
              userAddress: peer,
              lastMessage: initialMessages[initialMessages.length - 1],
            });
            return newMap;
          });

          // start listening to this dm
          (async () => {
            const stream = await conv.stream();
            for await (const item of stream) {
              if (!alive) break;
              if (!isDecodedMessage(item)) continue;

              setConversations((prev) => {
                const newMap = new Map(prev);
                const existing = newMap.get(conv.id);
                if (existing) {
                  if (!existing.messages.some((m) => m.id === item.id)) {
                    newMap.set(conv.id, {
                      ...existing,
                      messages: [...existing.messages, item],
                      lastMessage: item,
                    });
                  }
                }
                return newMap;
              });
            }
          })();
        }
      } catch (e) {
        console.error("Admin setup error:", e);
        if (alive) setError("Failed to load conversations.");
      }
    };

    setup();
    return () => {
      alive = false;
    };
  }, [client]);

  // Scroll always on update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, selectedConversationId]);

  const createConversationWithUser = async () => {
    if (!newUserAddress.trim()) return;
    try {
      const identifier: Identifier = {
        identifier: newUserAddress,
        identifierKind: "Ethereum" as IdentifierKind,
      };
      const dm = await client.conversations.newDmWithIdentifier(identifier);
      const msgs = (await dm.messages()).filter(isDecodedMessage);
      const peer = await dm.peerInboxId();

      setConversations((prev) => {
        const newMap = new Map(prev);
        newMap.set(dm.id, {
          dm,
          messages: msgs,
          userAddress: peer,
          lastMessage: msgs.at(-1),
        });
        return newMap;
      });
      setSelectedConversationId(dm.id);
      setNewUserAddress("");
    } catch (e) {
      console.error("createConversation error:", e);
      setError("Failed to start conversation");
    }
  };

  const sendMessage = async () => {
    if (!selectedConversationId || !message.trim() || isSending) return;
    const convo = conversations.get(selectedConversationId);
    if (!convo) return;

    try {
      setIsSending(true);
      await convo.dm.send(message);
      setMessage("");
      const updated = (await convo.dm.messages()).filter(isDecodedMessage);
      setConversations((prev) => {
        const newMap = new Map(prev);
        newMap.set(selectedConversationId, {
          ...convo,
          messages: updated,
          lastMessage: updated.at(-1),
        });
        return newMap;
      });
    } catch (e) {
      console.error("send error:", e);
      setError("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const selectedConv = selectedConversationId
    ? conversations.get(selectedConversationId)
    : null;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-1/3 bg-gray-900 text-white flex flex-col border-r border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h2 className="font-semibold mb-2 text-blue-700">Admin Panel</h2>
          <div className="flex gap-2">
            <input
              value={newUserAddress}
              onChange={(e) => setNewUserAddress(e.target.value)}
              placeholder="User address (0x..)"
              className="flex-1 bg-gray-800 px-2 py-1 rounded"
            />
            <button
              onClick={createConversationWithUser}
              className="bg-blue-600 px-3 py-1 rounded"
            >
              Add
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {Array.from(conversations.values())
            .sort(
              (a, b) =>
                (b.lastMessage?.sentAtNs ? Number(b.lastMessage.sentAtNs) : 0) -
                (a.lastMessage?.sentAtNs ? Number(a.lastMessage.sentAtNs) : 0)
            )
            .map((conv) => (
              <div
                key={conv.dm.id}
                className={`p-3 cursor-pointer border-b border-gray-800 ${
                  selectedConversationId === conv.dm.id ? "bg-gray-800" : ""
                }`}
                onClick={() => setSelectedConversationId(conv.dm.id)}
              >
                <div className="font-medium">
                  {conv.userAddress.slice(0, 6)}...{conv.userAddress.slice(-4)}
                </div>
                {conv.lastMessage && (
                  <div className="text-xs text-gray-400 truncate">
                    {renderMessageContent(conv.lastMessage.content)}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col bg-gray-300">
        {selectedConv ? (
          <>
            <div className="p-4 border-b bg-white">
              Chat with {selectedConv.userAddress.slice(0, 6)}...
              {selectedConv.userAddress.slice(-4)}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {selectedConv.messages.map((msg) => {
                const mine = msg.senderInboxId === client.inboxId;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`px-3 py-2 rounded-lg max-w-[70%] ${
                        mine ? "bg-blue-600 text-white" : "bg-gray-600 border"
                      }`}
                    >
                      {renderMessageContent(msg.content)}
                      <div className="text-[10px] text-gray-400 mt-1 text-right">
                        {new Date(
                          Number(msg.sentAtNs / 1000000n)
                        ).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-2 border-t bg-gray-500 flex gap-2">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && sendMessage()
                }
                className="flex-1 border rounded px-2 py-1"
                placeholder="Type a message..."
              />
              <button
                className="bg-blue-600 text-white px-3 rounded"
                onClick={sendMessage}
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a user
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminInterface;
