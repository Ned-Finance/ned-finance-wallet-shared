import { Dimensions } from "react-native";

export const sw = Dimensions.get("window").width;
export const sh = Dimensions.get("window").height;

export const getShortAddress = (address: string) => {
	return `${address.slice(0, 4)}...${address.slice(
		address.length - 4,
		address.length
	)}`;
};

export const getTxIdFromHash = (hash: string) => {
	return `${hash.slice(0, 4)}...${hash.slice(hash.length - 4, hash.length)}`;
};
