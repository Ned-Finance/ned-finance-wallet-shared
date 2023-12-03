import firestore, {
	FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import { ChatListItem, ChatMessage } from "../../chat/types";
import { logInfo } from "../../common/logging";

const CHAT_COLLECTION_NAME = "chats";
const CHAT_MESSAGES_COLLECTION_NAME = "messages";

const collectionKey = (from: string, to: string) => [from, to].sort().join("-");

const meta = {
	file: "utils/firebase/chat/index.ts",
};

export const _saveChatMessage = async (
	from: string,
	to: string,
	message: Omit<ChatMessage, "id">
) => {
	const batch = firestore().batch();

	const key = collectionKey(from, to);
	const chat = await firestore().collection(CHAT_COLLECTION_NAME);

	const getMessagesCollection = async () => {
		const chatDoc = await chat.doc(key).get();
		if (chatDoc.exists) {
			return chat.doc(key).collection(CHAT_MESSAGES_COLLECTION_NAME);
		} else {
			return chat.doc(key).collection(CHAT_MESSAGES_COLLECTION_NAME);
		}
	};

	const messagesCollection = await getMessagesCollection();
	const doc = await messagesCollection.doc().get();
	const data = { id: doc.id, deleted: false, ...message };

	batch.set(messagesCollection.doc(doc.id), data);
	batch.set(chat.doc(key), data);

	await batch.commit();

	return true;
};

export const _deleteChatMessage = async (
	from: string,
	to: string,
	messageId: string
) => {
	const batch = firestore().batch();

	const key = collectionKey(from, to);
	const chat = await firestore().collection(CHAT_COLLECTION_NAME);

	const messagesCollection = await chat
		.doc(key)
		.collection(CHAT_MESSAGES_COLLECTION_NAME);

	const document = await messagesCollection.doc(messageId).get();
	const documentData = document.data() as ChatMessage;

	const documentBefore = await firestore()
		.collection<ChatMessage>(CHAT_COLLECTION_NAME)
		.doc(key)
		.collection(CHAT_MESSAGES_COLLECTION_NAME)
		.orderBy("deleted", "asc")
		.orderBy("date", "desc")
		.where("deleted", "==", false)
		.limit(2)
		.get();

	const chatCollection = await chat.doc(key);

	if (documentBefore.size == 2) {
		const [lastMessage, previousMessage] = documentBefore.docs;
		if (lastMessage.id == messageId) {
			batch.set(chatCollection, previousMessage.data());
		}
	} else if (documentBefore.size == 1) {
		const lastMessage = documentBefore.docs[0];
		if (lastMessage.id == messageId) {
			batch.set(chatCollection, {});
		}
	}

	batch.set(
		messagesCollection.doc(messageId),
		{ deleted: true, deletedAt: Date.now() },
		{ merge: true }
	);

	await batch.commit();

	return true;
};

export const _getChatMessages = async (
	from: string,
	to: string,
	limit: number,
	afterDate: number
) => {
	const key = collectionKey(from, to);
	const chats = await firestore()
		.collection<ChatMessage>(CHAT_COLLECTION_NAME)
		.doc(key)
		.collection(CHAT_MESSAGES_COLLECTION_NAME)
		.orderBy("deleted", "asc")
		.orderBy("date")
		.where("deleted", "!=", true)
		.endBefore(afterDate)
		.limit(limit)
		.get();

	return chats.docs.map((x) => x.data() as ChatMessage);
};

export const _getChatMessagesSnapshot = (
	from: string,
	to: string,
	next: (snapshot: ChatMessage[]) => void,
	error: (error: Error) => void
) => {
	const key = collectionKey(from, to);
	const subscription = firestore()
		.collection<ChatMessage>(CHAT_COLLECTION_NAME)
		.doc(key)
		.collection(CHAT_MESSAGES_COLLECTION_NAME)
		.orderBy("deleted", "asc")
		.orderBy("date", "desc")
		.where("deleted", "!=", true)
		.limit(20)
		.onSnapshot({
			next: (
				querySnapshot: FirebaseFirestoreTypes.QuerySnapshot<FirebaseFirestoreTypes.DocumentData>
			) => {
				next(querySnapshot.docs.map((x) => x.data()) as ChatMessage[]);
			},
			error,
		});

	return subscription;
};

const _getChatQuery = (address: string, filterAddress?: string[]) => {
	const query = firestore()
		.collection<ChatListItem>(CHAT_COLLECTION_NAME)
		.orderBy("date", "desc");

	const queryWithFiler =
		filterAddress && filterAddress.length > 0
			? query.where(
					firestore.Filter.and(
						firestore.Filter("from", "in", [...filterAddress, address]),
						firestore.Filter("to", "in", [...filterAddress, address])
					)
			  )
			: query.where(
					firestore.Filter.or(
						firestore.Filter("from", "==", address),
						firestore.Filter("to", "==", address)
					)
			  );

	return queryWithFiler;
};

export const _getChatsListSnapshot = (
	address: string,
	limit: number = 20,
	next: (snapshot: ChatListItem[]) => void,
	error: (error: Error) => void,
	filterAddress?: string[]
) => {
	logInfo({
		message: `Searching for chats on snapshopt for address ${address}. Limit = ${limit}, filterAddess = ${filterAddress?.join(
			","
		)}`,
		meta,
	});

	const queryWithFiler = _getChatQuery(address, filterAddress);

	const subscription = queryWithFiler.limit(limit).onSnapshot({
		next: (
			querySnapshot: FirebaseFirestoreTypes.QuerySnapshot<FirebaseFirestoreTypes.DocumentData>
		) => {
			logInfo({
				message: `Found ${
					querySnapshot.docs.length
				} docs on snapshopt for address ${address}. Limit = ${limit}, filterAddess = ${filterAddress?.join(
					","
				)}`,
				meta,
			});

			next(
				querySnapshot.docs.map((x) => ({
					...x.data(),
					id: x.id,
				})) as ChatListItem[]
			);
		},
		error,
	});

	return subscription;
};

export const _getChatsListItems = async (
	address: string,
	limit: number = 20,
	afterDate: number,
	filterAddress?: string[]
) => {
	logInfo({
		message: `Searching for chats on snapshopt for address ${address}. Limit = ${limit}, afterDate = ${afterDate}, filterAddess = ${filterAddress?.join(
			","
		)}`,
		meta,
	});

	const queryWithFiler = _getChatQuery(address, filterAddress);

	const chats = await queryWithFiler.startAfter(afterDate).limit(limit).get();

	logInfo({
		message: `Found ${
			chats.docs.length
		} docs on snapshopt for address ${address}. Limit = ${limit}, afterDate = ${afterDate}, filterAddess = ${filterAddress?.join(
			","
		)}`,
		meta,
	});

	return chats.docs.map(
		(x) =>
			({
				...x.data(),
				id: x.id,
			}) as ChatListItem
	);
};
