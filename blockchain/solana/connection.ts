import { Connection } from "@solana/web3.js";
import { getConfig } from "../../utils/config";

const selectedConfig = getConfig();

export const getConnection = (): Connection => {
	return new Connection(selectedConfig.solana.HTTP_RPC_ENDPOINT, {
		wsEndpoint: selectedConfig.solana.WS_RPC_ENDPOINT,
		commitment: "confirmed",
	});
};
