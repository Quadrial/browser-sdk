// import { useState, useEffect, useRef } from "react";
// import {
//   Client,
//   Dm,
//   DecodedMessage,
//   type Identifier,
//   type IdentifierKind,
// } from "@xmtp/browser-sdk";

// interface AdminInterfaceProps {
//   client: Client;
// }

// interface ConversationData {
//   dm: Dm;
//   messages: DecodedMessage[];
//   userAddress: string;
//   lastMessage?: DecodedMessage;
// }

// // Helper function to safely render message content
// const renderMessageContent = (content: any): string => {
//   if (typeof content === "function") {
//     try {
//       // Execute function if it's a content encoder
//       return content();
//     } catch (e) {
//       console.error("Error rendering message content function:", e);
//       return "[Error rendering content]";
//     }
//   } else if (typeof content === "string") {
//     return content;
//   } else if (typeof content === "object" && content !== null) {
//     // For objects that aren't functions or strings, stringify them
//     // This handles metadata or other non-standard message payloads
//     return JSON.stringify(content);
//   }
//   // Fallback for any other unexpected types
//   return String(content);
// };

// // Helper to check if an item is a DecodedMessage
// const isDecodedMessage = (item: any): item is DecodedMessage => {
//   return (
//     item &&
//     typeof item === "object" &&
//     "id" in item &&
//     "senderInboxId" in item &&
//     "sentAtNs" in item &&
//     "content" in item &&
//     "conversation" in item && // Essential for DecodedMessage
//     item.conversation &&
//     typeof item.conversation === "object" &&
//     "id" in item.conversation // Ensure conversation property is valid
//   );
// };

// function AdminInterface({ client }: AdminInterfaceProps) {
//   const [conversations, setConversations] = useState<
//     Map<string, ConversationData>
//   >(new Map());
//   const [selectedConversation, setSelectedConversation] = useState<
//     string | null
//   >(null);
//   const [message, setMessage] = useState("");
//   const [isSending, setIsSending] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [newUserAddress, setNewUserAddress] = useState("");
//   const messagesEndRef = useRef<HTMLDivElement>(null);

//   // Load all existing conversations
//   useEffect(() => {
//     const loadConversations = async () => {
//       try {
//         const allConversations = await client.conversations.list();
//         const conversationMap = new Map<string, ConversationData>();

//         for (const conv of allConversations) {
//           if (conv instanceof Dm) {
//             const userAddress = await conv.peerInboxId();
//             // Filter messages to ensure only DecodedMessage are loaded
//             const messages = (await conv.messages()).filter(isDecodedMessage);
//             const lastMessage = messages[messages.length - 1];

//             conversationMap.set(conv.id, {
//               dm: conv,
//               messages,
//               userAddress,
//               lastMessage,
//             });
//           }
//         }

//         setConversations(conversationMap);
//       } catch (err) {
//         console.error("Failed to load conversations:", err);
//         setError("Failed to load conversations");
//       }
//     };

//     loadConversations();
//   }, [client]);

//   // Listen for new conversations and messages in REAL-TIME
//   useEffect(() => {
//     if (!client) return;

//     let isMounted = true;
//     const cleaners: (() => void)[] = [];

//     const setup = async () => {
//       try {
//         const allConversations = await client.conversations.list();
//         for (const conv of allConversations) {
//           if (!(conv instanceof Dm)) continue;

//           const userAddress = await conv.peerInboxId();
//           const initial = (await conv.messages()).filter(isDecodedMessage);

//           // Add to state
//           setConversations((prev) => {
//             const newMap = new Map(prev);
//             newMap.set(conv.id, {
//               dm: conv,
//               messages: initial,
//               userAddress,
//               lastMessage: initial[initial.length - 1],
//             });
//             return newMap;
//           });

//           // Start streaming this conversation’s messages
//           const run = async () => {
//             const stream = await conv.streamMessages();
//             for await (const msg of stream) {
//               if (!isMounted) break;
//               if (!isDecodedMessage(msg)) continue;

//               setConversations((prev) => {
//                 const newMap = new Map(prev);
//                 const existing = newMap.get(conv.id);
//                 if (existing) {
//                   if (!existing.messages.some((m) => m.id === msg.id)) {
//                     newMap.set(conv.id, {
//                       ...existing,
//                       messages: [...existing.messages, msg],
//                       lastMessage: msg,
//                     });
//                   }
//                 }
//                 return newMap;
//               });
//             }
//           };
//           run();

//           // Cleaner to stop streaming when component unmounts
//           cleaners.push(() => conv.streamMessages().then((s) => s.return?.()));
//         }
//       } catch (err) {
//         console.error("AdminInterface error streaming messages:", err);
//         setError("Error streaming messages");
//       }
//     };

//     setup();

//     return () => {
//       isMounted = false;
//       cleaners.forEach((c) => c());
//     };
//   }, [client]);
//   useEffect(() => {
//     if (!client) return;

//     let isMounted = true;
//     const cleaners: (() => void)[] = [];

//     const setup = async () => {
//       try {
//         const allConversations = await client.conversations.list();
//         for (const conv of allConversations) {
//           if (!(conv instanceof Dm)) continue;

//           const userAddress = await conv.peerInboxId();
//           const initial = (await conv.messages()).filter(isDecodedMessage);

//           // Add to state
//           setConversations((prev) => {
//             const newMap = new Map(prev);
//             newMap.set(conv.id, {
//               dm: conv,
//               messages: initial,
//               userAddress,
//               lastMessage: initial[initial.length - 1],
//             });
//             return newMap;
//           });

//           // Start streaming this conversation’s messages
//           const run = async () => {
//             const stream = await conv.streamMessages();
//             for await (const msg of stream) {
//               if (!isMounted) break;
//               if (!isDecodedMessage(msg)) continue;

//               setConversations((prev) => {
//                 const newMap = new Map(prev);
//                 const existing = newMap.get(conv.id);
//                 if (existing) {
//                   if (!existing.messages.some((m) => m.id === msg.id)) {
//                     newMap.set(conv.id, {
//                       ...existing,
//                       messages: [...existing.messages, msg],
//                       lastMessage: msg,
//                     });
//                   }
//                 }
//                 return newMap;
//               });
//             }
//           };
//           run();

//           // Cleaner to stop streaming when component unmounts
//           cleaners.push(() => conv.streamMessages().then((s) => s.return?.()));
//         }
//       } catch (err) {
//         console.error("AdminInterface error streaming messages:", err);
//         setError("Error streaming messages");
//       }
//     };

//     setup();

//     return () => {
//       isMounted = false;
//       cleaners.forEach((c) => c());
//     };
//   }, [client]);
//   useEffect(() => {
//     if (!client) return;

//     let isMounted = true;
//     const cleaners: (() => void)[] = [];

//     const setup = async () => {
//       try {
//         const allConversations = await client.conversations.list();
//         for (const conv of allConversations) {
//           if (!(conv instanceof Dm)) continue;

//           const userAddress = await conv.peerInboxId();
//           const initial = (await conv.messages()).filter(isDecodedMessage);

//           // Add to state
//           setConversations((prev) => {
//             const newMap = new Map(prev);
//             newMap.set(conv.id, {
//               dm: conv,
//               messages: initial,
//               userAddress,
//               lastMessage: initial[initial.length - 1],
//             });
//             return newMap;
//           });

//           // Start streaming this conversation’s messages
//           const run = async () => {
//             const stream = await conv.streamMessages();
//             for await (const msg of stream) {
//               if (!isMounted) break;
//               if (!isDecodedMessage(msg)) continue;

//               setConversations((prev) => {
//                 const newMap = new Map(prev);
//                 const existing = newMap.get(conv.id);
//                 if (existing) {
//                   if (!existing.messages.some((m) => m.id === msg.id)) {
//                     newMap.set(conv.id, {
//                       ...existing,
//                       messages: [...existing.messages, msg],
//                       lastMessage: msg,
//                     });
//                   }
//                 }
//                 return newMap;
//               });
//             }
//           };
//           run();

//           // Cleaner to stop streaming when component unmounts
//           cleaners.push(() => conv.streamMessages().then((s) => s.return?.()));
//         }
//       } catch (err) {
//         console.error("AdminInterface error streaming messages:", err);
//         setError("Error streaming messages");
//       }
//     };

//     setup();

//     return () => {
//       isMounted = false;
//       cleaners.forEach((c) => c());
//     };
//   }, [client]);

//   // Auto-scroll to bottom when messages change for the selected conversation
//   useEffect(() => {
//     // Scroll only if there's a selected conversation and messages exist for it
//     if (selectedConversation && messagesEndRef.current) {
//       messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
//     }
//   }, [conversations, selectedConversation]); // Depend on conversations and selectedConversation

//   const createConversationWithUser = async () => {
//     if (!newUserAddress.trim()) return;

//     try {
//       setError(null);
//       const identifier: Identifier = {
//         identifier: newUserAddress,
//         identifierKind: "Ethereum" as IdentifierKind,
//       };

//       const dm = await client.conversations.newDmWithIdentifier(identifier);
//       // Load messages for the new conversation
//       const messages = (await dm.messages()).filter(isDecodedMessage);
//       const userAddress = await dm.peerInboxId();

//       setConversations((prev) => {
//         const newMap = new Map(prev);
//         newMap.set(dm.id, {
//           // Use conversation ID as key
//           dm,
//           messages,
//           userAddress,
//         });
//         return newMap;
//       });

//       setSelectedConversation(dm.id);
//       setNewUserAddress("");
//     } catch (err) {
//       console.error("Failed to create conversation:", err);
//       setError("Failed to create conversation with user");
//     }
//   };

//   const sendMessage = async () => {
//     if (!selectedConversation || !message.trim() || isSending) return;

//     const conversation = conversations.get(selectedConversation);
//     if (!conversation) return;

//     try {
//       setIsSending(true);
//       setError(null);

//       await conversation.dm.send(message);
//       setMessage("");

//       // Refresh messages to show the sent message and update lastMessage
//       const updatedMessages = (await conversation.dm.messages()).filter(
//         isDecodedMessage
//       );
//       setConversations((prev) => {
//         const newMap = new Map(prev);
//         const existing = newMap.get(selectedConversation);
//         if (existing) {
//           newMap.set(selectedConversation, {
//             ...existing,
//             messages: updatedMessages,
//             lastMessage: updatedMessages[updatedMessages.length - 1],
//           });
//         }
//         return newMap;
//       });
//     } catch (err) {
//       console.error("Failed to send message:", err);
//       setError("Failed to send message");
//     } finally {
//       setIsSending(false);
//     }
//   };

//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault(); // Prevent default newline on Enter
//       sendMessage();
//     }
//   };

//   const selectedConv = selectedConversation
//     ? conversations.get(selectedConversation)
//     : null;

//   return (
//     <div className="flex h-full">
//       {/* Sidebar with conversations */}
//       <div className="w-1/3 bg-gray-800 border-r border-gray-700 flex flex-col">
//         <div className="p-4 border-b border-gray-700">
//           <h2 className="text-lg font-semibold mb-4">Admin Panel</h2>
//           <div className="flex gap-2">
//             <input
//               type="text"
//               value={newUserAddress}
//               onChange={(e) => setNewUserAddress(e.target.value)}
//               placeholder="User address (0x...)"
//               className="flex-1 p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
//             />
//             <button
//               onClick={createConversationWithUser}
//               disabled={!newUserAddress.trim()}
//               className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               Add
//             </button>
//           </div>
//         </div>

//         <div className="flex-1 overflow-y-auto">
//           {/* Sort conversations by last message date */}
//           {Array.from(conversations.values())
//             .sort((a, b) => {
//               // Handle cases where lastMessage might be undefined
//               const timeA = a.lastMessage?.sentAtNs;
//               const timeB = b.lastMessage?.sentAtNs;

//               if (!timeA && !timeB) return 0;
//               if (!timeA) return 1; // a comes after b if a has no message
//               if (!timeB) return -1; // b comes after a if b has no message
//               // Sort by time descending (most recent first)
//               return Number(timeB) - Number(timeA);
//             })
//             .map((conv) => (
//               <div
//                 key={conv.dm.id}
//                 onClick={() => setSelectedConversation(conv.dm.id)}
//                 className={`p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors duration-150 ${
//                   selectedConversation === conv.dm.id ? "bg-gray-700" : ""
//                 }`}
//               >
//                 <div className="font-medium text-sm">
//                   {conv.userAddress.slice(0, 6)}...{conv.userAddress.slice(-4)}
//                 </div>
//                 {conv.lastMessage && (
//                   <div className="text-xs text-gray-400 mt-1 truncate">
//                     {renderMessageContent(conv.lastMessage.content)}
//                   </div>
//                 )}
//                 <div className="text-xs text-gray-500 mt-1">
//                   {conv.messages.length} message
//                   {conv.messages.length !== 1 ? "s" : ""}
//                 </div>
//               </div>
//             ))}
//         </div>
//       </div>

//       {/* Main chat area */}
//       <div className="flex-1 flex flex-col">
//         {selectedConv ? (
//           <>
//             <div className="p-4 border-b border-gray-700 bg-gray-800 sticky top-0 z-10">
//               <h3 className="font-semibold">
//                 Chat with {selectedConv.userAddress.slice(0, 6)}...
//                 {selectedConv.userAddress.slice(-4)}
//               </h3>
//             </div>

//             <div className="flex-1 overflow-y-auto p-4 space-y-4">
//               {/* Render only valid DecodedMessages */}
//               {selectedConv.messages.filter(isDecodedMessage).map((msg) => (
//                 <div
//                   key={msg.id}
//                   className={`flex items-start gap-3 ${
//                     msg.senderInboxId === client?.inboxId
//                       ? "flex-row-reverse"
//                       : ""
//                   }`}
//                 >
//                   {/* Avatar placeholder or actual avatar if available */}
//                   <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold uppercase flex-shrink-0">
//                     {msg.senderInboxId === client?.inboxId ? "A" : "U"}
//                   </div>
//                   <div
//                     className={`p-3 rounded-lg max-w-sm md:max-w-md lg:max-w-lg shadow-md ${
//                       msg.senderInboxId === client?.inboxId
//                         ? "bg-blue-600 text-white" // Admin message style
//                         : "bg-gray-700 text-gray-200" // User message style
//                     }`}
//                   >
//                     <p className="text-sm font-medium mb-1">
//                       {msg.senderInboxId === client?.inboxId ? "You" : "User"}
//                     </p>
//                     <p className="break-words text-sm leading-relaxed">
//                       {renderMessageContent(msg.content)}
//                     </p>
//                     <p className="text-xs text-gray-400 mt-1 text-right">
//                       {new Date(
//                         Number(msg.sentAtNs / 1000000n)
//                       ).toLocaleTimeString([], {
//                         hour: "2-digit",
//                         minute: "2-digit",
//                       })}
//                     </p>
//                   </div>
//                 </div>
//               ))}
//               <div ref={messagesEndRef} />
//             </div>

//             {error && (
//               <div className="mx-4 mb-4 p-3 bg-red-500 text-white rounded-lg">
//                 {error}
//               </div>
//             )}

//             <div className="p-4 border-t border-gray-700 bg-gray-800">
//               <div className="flex gap-2 items-end">
//                 {" "}
//                 {/* Align items to bottom */}
//                 <textarea
//                   value={message}
//                   onChange={(e) => setMessage(e.target.value)}
//                   onKeyPress={handleKeyPress}
//                   placeholder="Type your message..."
//                   className="flex-1 p-3 rounded-lg bg-gray-800 text-white resize-none border border-gray-600 focus:border-blue-500 focus:outline-none shadow-sm"
//                   rows={2}
//                   disabled={isSending}
//                   style={{ minHeight: "48px" }} // Match approximate height of a few lines
//                 />
//                 <button
//                   onClick={sendMessage}
//                   disabled={!message.trim() || isSending}
//                   className={`px-5 py-3 rounded-lg font-medium transition-colors shadow-sm flex-shrink-0 ${
//                     !message.trim() || isSending
//                       ? "bg-gray-600 cursor-not-allowed"
//                       : "bg-blue-600 hover:bg-blue-700"
//                   }`}
//                 >
//                   {isSending ? "Sending..." : "Send"}
//                 </button>
//               </div>
//             </div>
//           </>
//         ) : (
//           // Default view when no conversation is selected
//           <div className="flex-1 flex items-center justify-center text-gray-400">
//             <div className="text-center">
//               <p className="text-lg mb-2">Select a conversation</p>
//               <p className="text-sm">
//                 Choose a user from the sidebar to start chatting
//               </p>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default AdminInterface;

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
          <h2 className="font-semibold mb-2">Admin Panel</h2>
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
      <div className="flex-1 flex flex-col bg-gray-100">
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
                        mine ? "bg-blue-600 text-white" : "bg-white border"
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
            <div className="p-2 border-t bg-white flex gap-2">
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
