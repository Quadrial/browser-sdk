import { type WalletClient } from "viem";
import {
  type Signer,
  type Identifier,
  type IdentifierKind,
} from "@xmtp/browser-sdk";
import { Buffer } from "buffer";

/**
 * Creates an XMTP signer from a wagmi wallet client
 * @param walletClient The wagmi wallet client
 * @returns An XMTP signer
 */
export const createWalletSigner = (walletClient: WalletClient): Signer => {
  return {
    type: "EOA",
    getIdentifier: async () => {
      console.log("Getting wallet identifier...");
      const accounts = await walletClient.getAddresses();
      console.log("Wallet accounts:", accounts);
      const identifier: Identifier = {
        identifier: accounts[0],
        identifierKind: "Ethereum" as IdentifierKind,
      };
      console.log("Created identifier:", identifier);
      return identifier;
    },
    signMessage: async (message: string) => {
      console.log("Signing message:", message);
      const accounts = await walletClient.getAddresses();
      const signature = await walletClient.signMessage({
        account: accounts[0],
        message,
      });
      console.log("Message signed successfully");
      // Convert hex string to Uint8Array
      try {
        // Try using Buffer if available
        return new Uint8Array(Buffer.from(signature.slice(2), "hex"));
      } catch {
        // Fallback to manual conversion
        console.log("Using fallback hex conversion");
        const hex = signature.slice(2); // Remove '0x' prefix
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
      }
    },
  };
};
