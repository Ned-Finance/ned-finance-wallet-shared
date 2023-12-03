export type ChatMessageType =
	| "transfer-token"
	| "request-token"
	| "text"
	| "gif";

export type BaseMessage = {
	type: ChatMessageType;
	date: number;
	id: string;
	from: string;
	to: string;
};

export type BaseBoxProps = {
	direction: string;
	userAddress: string;
};

export type TransferTokenMessage = {
	amount: number;
	network: string;
	txId: string;
	text: string;
	symbol: string;
	token: {
		mint: string;
		logoURI: string;
	};
} & BaseMessage;

export type RequestTokenMessage = {
	amount: number;
	network: string;
	text: string;
	symbol: string;
	token: {
		mint: string;
		logoURI: string;
	};
} & BaseMessage;

export type TransferRequestToken = {
	from: string;
	to: string;
	amount: number;
	network: string;
	symbol: string;
	mint: string;
	text: string;
};

export type TextMessage = {
	text: string;
} & BaseMessage;

export type GifMessage = {
	text: string;
	url: string;
} & BaseMessage;

export type ChatMessage = TransferTokenMessage | TextMessage | GifMessage;

export type ChatListItem = ChatMessage;
