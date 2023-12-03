import dayjs from "dayjs";
import _ from "lodash";
import {
	_deleteChatMessage,
	_getChatMessages,
	_getChatMessagesSnapshot,
	_getChatsListItems,
	_getChatsListSnapshot,
	_saveChatMessage,
} from "../firebase/firestore";
import { Network } from "../networks";
import {
	ChatListItem,
	ChatMessage,
	GifMessage,
	RequestTokenMessage,
	TextMessage,
	TransferTokenMessage,
} from "./types";

export const sendTextMessage = async (
	from: string,
	to: string,
	text: string
) => {
	await _saveChatMessage(from, to, {
		type: "text",
		date: Date.now(),
		from,
		to,
		text,
	} as Omit<TextMessage, "id">);
};

export const sendGifMessage = async (from: string, to: string, url: string) => {
	await _saveChatMessage(from, to, {
		type: "gif",
		date: Date.now(),
		from,
		to,
		url,
	} as Omit<GifMessage, "id">);
};

export const sendTransferTokenMessage = async (
	from: string,
	to: string,
	text: string,
	amount: number,
	network: Network,
	txId: string,
	mint: string,
	symbol: string,
	logoURI: string
) => {
	await _saveChatMessage(from, to, {
		type: "transfer-token",
		date: Date.now(),
		from,
		to,
		text,
		amount,
		network,
		txId,
		symbol,
		token: {
			mint,
			logoURI,
		},
	} as Omit<TransferTokenMessage, "id">);
};

export const deleteChatMessage = async (
	from: string,
	to: string,
	messageId: string
) => {
	await _deleteChatMessage(from, to, messageId);
};

export const sendRequestTokenMessage = async (
	from: string,
	to: string,
	text: string,
	amount: number,
	network: Network,
	mint: string,
	symbol: string,
	logoURI: string
) => {
	await _saveChatMessage(from, to, {
		type: "request-token",
		date: Date.now(),
		from,
		to,
		text,
		amount,
		network,
		symbol,
		token: {
			mint,
			logoURI,
		},
	} as Omit<RequestTokenMessage, "id">);
};

export const getChatMessages = async (
	from: string,
	to: string,
	limit: number,
	afterDate: number
) => await _getChatMessages(from, to, limit, afterDate);

export const getChatMessagesSnapshot = (
	from: string,
	to: string,
	next: (snapshot: ChatMessage[]) => void,
	error: (error: Error) => void
) => {
	return _getChatMessagesSnapshot(from, to, next, error);
};

export const getChatsListSnapshot = (
	address: string,
	limit: number,
	next: (snapshot: ChatListItem[]) => void,
	error: (error: Error) => void,
	filterAddress?: string[]
) => {
	return _getChatsListSnapshot(address, limit, next, error, filterAddress);
};

export const getChatsListItems = (
	address: string,
	limit: number,
	afterDate: number,
	filterAddress?: string[]
) => {
	return _getChatsListItems(address, limit, afterDate, filterAddress);
};

export const sortChatMessages = (messages: ChatMessage[]) => {
	const messagesWithDateString = messages.map((message) => ({
		...message,
		day: dayjs(message.date).startOf("day").valueOf(),
		dateString: dayjs(message.date).startOf("day").format(),
		hour: dayjs(message.date).format("HH:mm"),
	}));

	const ordered = _.orderBy(
		messagesWithDateString,
		["day", "date"],
		["desc", "desc"]
	);

	return _.uniqBy(ordered, "id");
};
