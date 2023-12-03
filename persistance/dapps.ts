import AsyncStorage from "@react-native-async-storage/async-storage";
import * as shortuuid from "short-uuid";
import { ConnectedDapp } from "../dapps/types";

const CONNECTED_DAPPS_KEY = "CONNECTED_DAPPS_KEY";

export const _saveConnectedDapp = async (
	user: string,
	connectedDapp: Omit<ConnectedDapp, "id" | "updatedAt"> & {
		id?: string;
		updatedAt?: number;
	}
): Promise<boolean> => {
	try {
		console.log("connectedDapp ==>", connectedDapp);
		const dapps = await AsyncStorage.getItem(`${CONNECTED_DAPPS_KEY}-${user}`);
		const dappsJson = JSON.parse(dapps || "[]") as ConnectedDapp[];

		const dappList = (() => {
			const dappIndex = dappsJson.findIndex(
				(d) => d.domain == connectedDapp.domain
			);
			if (dappIndex > -1) {
				return dappsJson.map((dapp, index) => {
					if (index == dappIndex) {
						return {
							...dapp,
							...connectedDapp,
						};
					} else {
						return dapp;
					}
				});
			} else
				return dappsJson.concat([
					{
						...connectedDapp,
						id: shortuuid.generate(),
						updatedAt: Date.now(),
					},
				]);
		})();

		await AsyncStorage.setItem(
			`${CONNECTED_DAPPS_KEY}-${user}`,
			JSON.stringify(dappList)
		);
		return true;
	} catch (e) {
		return false;
	}
};

export const _deleteConnectedDapp = async (
	user: string,
	connectedDappId: string
): Promise<boolean> => {
	try {
		const dapps = await AsyncStorage.getItem(`${CONNECTED_DAPPS_KEY}-${user}`);

		const dappsJson = JSON.parse(dapps || "[]") as ConnectedDapp[];
		const updatedConnectedDapps = dappsJson.filter(
			(d) => d.id != connectedDappId
		);
		await AsyncStorage.setItem(
			`${CONNECTED_DAPPS_KEY}-${user}`,
			JSON.stringify(updatedConnectedDapps)
		);

		return true;
	} catch (e) {
		return false;
	}
};

export const _getConnectedDappByUrl = async (
	user: string,
	domain: string
): Promise<ConnectedDapp | null> => {
	try {
		const dapps = await AsyncStorage.getItem(`${CONNECTED_DAPPS_KEY}-${user}`);
		const dappsJson = JSON.parse(dapps || "[]") as ConnectedDapp[];
		const updatedConnectedDapps = dappsJson.find((d) => d.domain == domain);
		if (updatedConnectedDapps) return updatedConnectedDapps;
		else return null;
	} catch (e) {
		return null;
	}
};

export const _getConnectedDapps = async (
	user: string
): Promise<ConnectedDapp[]> => {
	try {
		const dapps = await AsyncStorage.getItem(`${CONNECTED_DAPPS_KEY}-${user}`);
		if (dapps) return JSON.parse(dapps) as ConnectedDapp[];
		else return [];
	} catch (e) {
		return [];
	}
};
