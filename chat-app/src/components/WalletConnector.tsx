import { useConnect } from "wagmi";
import { getWalletClient } from "wagmi/actions";
import { useState } from "react";
import { type WalletClient } from "viem";
import { type Connector } from "wagmi";
import { config } from "../main";

interface WalletConnectorProps {
  onConnect: (walletClient: WalletClient) => void;
}

function WalletConnector({ onConnect }: WalletConnectorProps) {
  const { connect, connectors, isPending } = useConnect();
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (connector: Connector) => {
    try {
      setError(null);
      await connect({ connector });
      const walletClient = await getWalletClient(config);
      if (walletClient) {
        onConnect(walletClient);
      }
    } catch (err) {
      console.error("Failed to connect wallet:", err);
      setError("Failed to connect wallet. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <h2 className="text-xl">Connect your wallet</h2>
      {error && <div className="text-red-500">{error}</div>}
      <button
        onClick={() => handleConnect(connectors[0])}
        disabled={isPending || connectors.length === 0}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-lg"
      >
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>
    </div>
  );
}

export default WalletConnector;
