import { avalancheIcon, ethereumIcon, polygonIcon, solanaIcon } from "../icons";

export enum Network {
	Ethereum = "ethereum",
	Solana = "solana",
	Polygon = "polygon",
	Avalanche = "avalanche",
	Aptos = "aptos",
	Sui = "sui",
}

export interface NetworkInfo {
	name: string;
	enum: Network;
	icon: string;
}

export const defaultNetwork: NetworkInfo = {
	name: "Solana",
	enum: Network.Solana,
	icon: solanaIcon,
};

export const supportedNeworks: NetworkInfo[] = [
	defaultNetwork,
	{
		name: "Ethereum",
		enum: Network.Ethereum,
		icon: ethereumIcon,
	},
	{
		name: "Polygon",
		enum: Network.Polygon,
		icon: polygonIcon,
	},
	{
		name: "Avalanche",
		enum: Network.Avalanche,
		icon: avalancheIcon,
	},
];
