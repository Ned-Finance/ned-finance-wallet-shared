import { Network } from "../networks";

export type Dapp = {
	name: string;
	description: string;
	logoURI: string;
	url: string;
	network: Network;
	category: string;
};

export type ConnectedDapp = {
	updatedAt: number;
	id: string;
	title: string;
	domain: string;
	trust: boolean;
	lastConnected: number;
} & Pick<Dapp, "logoURI" | "network">;
