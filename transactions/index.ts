export const getShortAddress = (address: string) => {
	return `${address.slice(0, 4)}...${address.slice(
		address.length - 4,
		address.length
	)}`;
};

export const getTxIdFromHash = (hash: string) => {
	return `${hash.slice(0, 4)}...${hash.slice(hash.length - 4, hash.length)}`;
};
