import axios from "axios";
import { Wallet } from "../..//types/wallet";
import { API_URL } from "../constants";
import {
	domainExists,
	getCreateSubdomainWithOwnerTransaction,
} from "../solana/domains";
import { CreateDomainForWalletResponse } from "./types";

export const isDomainAvailable = (domain: string) => !domainExists(domain);

export const getCreateDomainTransaction = (domain: string, wallet: Wallet) =>
	getCreateSubdomainWithOwnerTransaction(domain, wallet);

export const createDomainForWallet = async (serializedMessage: string) => {
	try {
		const response = await axios.post<CreateDomainForWalletResponse>(
			`${API_URL}/create-domain`,
			{ serializedMessage }
		);
		return response.data.success;
	} catch (e) {
		return null;
	}
};
