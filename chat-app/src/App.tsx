// import { useState, useEffect, useRef } from "react";
// import {
//   Client,
//   Dm,
//   DecodedMessage,
//   type Identifier,
//   type IdentifierKind,
// } from "@xmtp/browser-sdk";
// import WalletConnector from "./components/WalletConnector";
// import AdminInterface from "./components/AdminInterface";
// import { type WalletClient } from "viem";
// import { createWalletSigner } from "./utils/walletSigner";

// // Hardcoded admin address
// const ADMIN_ADDRESS = "0x1dcb5a1c5fa7571860926ff8f09ea959c49d3461";

// // --- Helper: type check ---
// function isDecodedMessage(item: any): item is DecodedMessage {
//   return (
//     item &&
//     typeof item === "object" &&
//     "id" in item &&
//     "senderInboxId" in item &&
//     "sentAtNs" in item &&
//     "content" in item
//   );
// }

// function App() {
//   const [client, setClient] = useState<Client | null>(null);
//   const [conversation, setConversation] = useState<Dm | null>(null);
//   const [messages, setMessages] = useState<DecodedMessage[]>([]);
//   const [message, setMessage] = useState("");
//   const [isSending, setIsSending] = useState(false);
//   const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [isAdmin, setIsAdmin] = useState<boolean>(false);
//   const [isRetrying, setIsRetrying] = useState<boolean>(false);
//   const messagesEndRef = useRef<HTMLDivElement>(null);

//   const onConnect = async (walletClient: WalletClient) => {
//     setWalletClient(walletClient);

//     // Check if the connected wallet is the admin
//     const accounts = await walletClient.getAddresses();
//     const connectedAddress = accounts[0]?.toLowerCase();
//     const adminAddress = ADMIN_ADDRESS.toLowerCase();

//     setIsAdmin(connectedAddress === adminAddress);
//   };

//   const retryConnection = async () => {
//     if (!walletClient) return;

//     setIsRetrying(true);
//     setError(null);
//     setClient(null);

//     try {
//       const signer = createWalletSigner(walletClient);

//       const xmtpClient = await Client.create(signer, {
//         env: "production",
//         loggingLevel: "debug",
//       });
//       setClient(xmtpClient);
//     } catch (err) {
//       setError(
//         `Failed to initialize XMTP client: ${
//           err instanceof Error ? err.message : "Unknown error"
//         }`
//       );
//     } finally {
//       setIsRetrying(false);
//     }
//   };

//   // Initialize XMTP client when wallet is connected
//   useEffect(() => {
//     const initClient = async () => {
//       if (walletClient && !client) {
//         try {
//           setError(null);
//           const signer = createWalletSigner(walletClient);

//           const xmtpClient = await Client.create(signer, {
//             env: "production",
//             loggingLevel: "debug",
//           });

//           setClient(xmtpClient);
//         } catch (err) {
//           setError(
//             `Failed to initialize XMTP client: ${
//               err instanceof Error ? err.message : "Unknown error"
//             }`
//           );
//         }
//       }
//     };

//     initClient();
//   }, [walletClient, client]);

//   // Initialize conversation with admin when client is ready
//   useEffect(() => {
//     const initConversation = async () => {
//       if (client && !conversation && !isAdmin) {
//         try {
//           setError(null);

//           const adminIdentifier: Identifier = {
//             identifier: ADMIN_ADDRESS,
//             identifierKind: "Ethereum" as IdentifierKind,
//           };

//           const dm = await client.conversations.newDmWithIdentifier(
//             adminIdentifier
//           );
//           setConversation(dm);
//         } catch (err) {
//           setError(
//             `Failed to initialize conversation with admin: ${
//               err instanceof Error ? err.message : "Unknown error"
//             }`
//           );
//         }
//       }
//     };

//     initConversation();
//   }, [client, conversation, isAdmin]);

//   // Load messages
//   useEffect(() => {
//     const loadMessages = async () => {
//       if (conversation) {
//         try {
//           const conversationMessages = await conversation.messages();
//           setMessages(conversationMessages.filter(isDecodedMessage));
//           scrollToBottom();
//         } catch (err) {
//           setError("Failed to load messages. Please try again.");
//         }
//       }
//     };

//     const scrollToBottom = () => {
//       messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//     };

//     loadMessages();
//   }, [conversation]);

//   // Listen for new messages
//   useEffect(() => {
//     if (!conversation) return;

//     let isMounted = true;
//     let stream: AsyncGenerator<any, void, unknown> | null = null;

//     const listenForMessages = async () => {
//       try {
//         stream = await conversation.stream();

//         for await (const msg of stream) {
//           if (!isMounted) break;

//           if (isDecodedMessage(msg)) {
//             setMessages((prev) => {
//               if (prev.some((m) => m.id === msg.id)) return prev;
//               return [...prev, msg];
//             });

//             setTimeout(() => {
//               messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//             }, 100);
//           } else {
//             console.log("Ignoring non-message event:", msg);
//           }
//         }
//       } catch (err) {
//         if (isMounted) {
//           setError("Error listening for messages. Please refresh the page.");
//         }
//       }
//     };

//     listenForMessages();

//     return () => {
//       isMounted = false;
//       if (stream && typeof stream.return === "function") {
//         stream.return();
//       }
//     };
//   }, [conversation]);

//   // Send a message
//   const sendMessage = async () => {
//     if (!conversation || !message.trim() || isSending) return;

//     try {
//       setIsSending(true);
//       setError(null);

//       await conversation.send(message);

//       setMessage("");

//       const conversationMessages = await conversation.messages();
//       setMessages(conversationMessages.filter(isDecodedMessage));
//     } catch (err) {
//       setError("Failed to send message. Please try again.");
//     } finally {
//       setIsSending(false);
//     }
//   };

//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       sendMessage();
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-900 text-white flex flex-col">
//       <header className="bg-gray-800 px-4 py-4 border-b border-gray-700">
//         <h1 className="text-2xl font-bold text-center">
//           {isAdmin ? "Admin Dashboard" : "XMTP Support Chat"}
//         </h1>
//       </header>

//       <div className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-4 py-4">
//         {!walletClient ? (
//           <div className="flex-1 flex items-center justify-center">
//             <WalletConnector onConnect={onConnect} />
//           </div>
//         ) : !client ? (
//           <div className="flex-1 flex items-center justify-center">
//             <div className="text-center">
//               {!error ? (
//                 <>
//                   <div className="animate-spin h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
//                   <p>Initializing XMTP client...</p>
//                 </>
//               ) : (
//                 <>
//                   <p className="text-lg mb-2">Connection Failed</p>
//                   <div className="bg-red-500 p-2 rounded">{error}</div>
//                   <button
//                     onClick={retryConnection}
//                     disabled={isRetrying}
//                     className="mt-2 px-4 py-2 bg-blue-600 rounded"
//                   >
//                     {isRetrying ? "Retrying..." : "Retry Connection"}
//                   </button>
//                 </>
//               )}
//             </div>
//           </div>
//         ) : isAdmin ? (
//           <AdminInterface client={client} />
//         ) : !conversation ? (
//           <div className="flex-1 flex items-center justify-center">
//             <p>Setting up conversation with admin...</p>
//           </div>
//         ) : (
//           <div className="flex-1 flex flex-col h-full">
//             {/* Messages */}
//             <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 bg-gray-800 rounded-lg">
//               {messages.length === 0 ? (
//                 <div className="text-center text-gray-400 py-8">
//                   <p>No messages yet. Start the conversation!</p>
//                 </div>
//               ) : (
//                 messages.map((msg) => (
//                   <div
//                     key={msg.id}
//                     className={`p-3 rounded-lg max-w-xs ${
//                       msg.senderInboxId === client?.inboxId
//                         ? "bg-blue-600 ml-auto"
//                         : "bg-gray-700 mr-auto"
//                     }`}
//                   >
//                     <p className="text-sm text-gray-300 mb-1">
//                       {msg.senderInboxId === client?.inboxId ? "You" : "Admin"}
//                     </p>
//                     <p className="break-words">{String(msg.content)}</p>
//                     <p className="text-xs text-gray-400 mt-1">
//                       {new Date(
//                         Number(msg.sentAtNs / 1000000n)
//                       ).toLocaleTimeString()}
//                     </p>
//                   </div>
//                 ))
//               )}
//               <div ref={messagesEndRef} />
//             </div>

//             {error && (
//               <div className="mb-4 p-3 bg-red-500 text-white rounded">
//                 {error}
//               </div>
//             )}

//             {/* Input */}
//             <div className="flex gap-2">
//               <textarea
//                 value={message}
//                 onChange={(e) => setMessage(e.target.value)}
//                 onKeyPress={handleKeyPress}
//                 placeholder="Type your message..."
//                 className="flex-1 p-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:border-blue-500"
//                 rows={2}
//                 disabled={isSending}
//               />
//               <button
//                 onClick={sendMessage}
//                 disabled={!message.trim() || isSending}
//                 className={`px-6 py-3 rounded-lg ${
//                   !message.trim() || isSending
//                     ? "bg-gray-600 cursor-not-allowed"
//                     : "bg-blue-600 hover:bg-blue-700"
//                 }`}
//               >
//                 {isSending ? "Sending..." : "Send"}
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default App;

import { useState, useEffect } from "react";
import { Client } from "@xmtp/browser-sdk";
import WalletConnector from "./components/WalletConnector";
import AdminInterface from "./components/AdminInterface";
import UserChat from "./components/UserChat";
import { type WalletClient } from "viem";
import { createWalletSigner } from "./utils/walletSigner";

const ADMIN_ADDRESS = "0x1dcb5a1c5fa7571860926ff8f09ea959c49d3461";

function App() {
  const [client, setClient] = useState<Client | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const onConnect = async (walletClient: WalletClient) => {
    setWalletClient(walletClient);
    const accounts = await walletClient.getAddresses();
    setIsAdmin(accounts[0]?.toLowerCase() === ADMIN_ADDRESS.toLowerCase());
  };

  // Init XMTP
  useEffect(() => {
    const init = async () => {
      if (walletClient && !client) {
        const signer = createWalletSigner(walletClient);
        const xmtp = await Client.create(signer, { env: "production" });
        setClient(xmtp);
      }
    };
    init();
  }, [walletClient]);

  if (!walletClient) {
    return (
      <div className="h-screen flex items-center justify-center">
        <WalletConnector onConnect={onConnect} />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="h-screen flex items-center justify-center">
        Connecting to XMTP...
      </div>
    );
  }

  return isAdmin ? (
    <AdminInterface client={client} />
  ) : (
    <UserChat client={client} adminAddress={ADMIN_ADDRESS} />
  );
}

export default App;
