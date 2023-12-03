export type ReceiveMessagesFrom = "everyone" | "only-contacts";
export type Settings = {
	pushNotifications: boolean;
	receiveMessagesFrom: ReceiveMessagesFrom;
};
