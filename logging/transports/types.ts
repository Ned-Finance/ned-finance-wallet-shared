export type TransportOptions = {
	level?: string;
	handleExceptions?: boolean;
	log?: (message: string, callback: () => void) => void;
	close?: () => void;
};
