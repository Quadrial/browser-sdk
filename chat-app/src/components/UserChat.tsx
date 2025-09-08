// components/UserChat.tsx
import { useState, useEffect, useRef } from "react";
import {
  Client,
  Dm,
  DecodedMessage,
  type Identifier,
  type IdentifierKind,
} from "@xmtp/browser-sdk";

interface UserChatProps {
  client: Client;
  adminAddress: string;
}

function isDecodedMessage(item: any): item is DecodedMessage {
  return (
    item &&
    typeof item === "object" &&
    "id" in item &&
    "senderInboxId" in item &&
    "sentAtNs" in item &&
    "content" in item
  );
}

export default function UserChat({ client, adminAddress }: UserChatProps) {
  const [conversation, setConversation] = useState<Dm | null>(null);
  const [messages, setMessages] = useState<DecodedMessage[]>([]);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Setup DM with Admin when client ready
  useEffect(() => {
    const initConversation = async () => {
      if (!client) return;
      try {
        const adminIdentifier: Identifier = {
          identifier: adminAddress,
          identifierKind: "Ethereum" as IdentifierKind,
        };
        const dm = await client.conversations.newDmWithIdentifier(
          adminIdentifier
        );
        setConversation(dm);
      } catch (err) {
        setError("Failed to start conversation with admin.");
      }
    };
    initConversation();
  }, [client, adminAddress]);

  // Load messages + stream new ones
  useEffect(() => {
    if (!conversation) return;
    let isMounted = true;
    (async () => {
      try {
        const initial = await conversation.messages();
        if (isMounted) setMessages(initial.filter(isDecodedMessage));
        const stream = await conversation.stream();
        for await (const msg of stream) {
          if (!isMounted) break;
          if (isDecodedMessage(msg)) {
            setMessages((prev) =>
              prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
            );
          }
        }
      } catch (err) {
        setError("Error streaming messages.");
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [conversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!conversation || !message.trim() || isSending) return;
    try {
      setIsSending(true);
      await conversation.send(message);
      setMessage("");
      const updated = await conversation.messages();
      setMessages(updated.filter(isDecodedMessage));
    } catch (err) {
      setError("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
        <h2 className="font-semibold">XMTP Support Chat</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const mine = msg.senderInboxId === client.inboxId;
          return (
            <div
              key={msg.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`px-4 py-2 rounded-xl max-w-xs ${
                  mine ? "bg-blue-600 text-white" : "bg-gray-700"
                }`}
              >
                {String(msg.content)}
                <div className="text-xs text-gray-300 mt-1 text-right">
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

      {/* Input */}
      <div className="p-3 bg-gray-800 flex gap-2">
        <input
          className="flex-1 px-3 py-2 rounded-lg bg-gray-700 text-white"
          placeholder="Write a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && !e.shiftKey ? sendMessage() : null
          }
        />
        <button
          onClick={sendMessage}
          disabled={!message.trim() || isSending}
          className="bg-blue-600 px-4 py-2 rounded-lg disabled:opacity-50"
        >
          Send
        </button>
      </div>
      {error && <div className="text-red-400 px-4">{error}</div>}
    </div>
  );
}
