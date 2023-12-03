import firestore, {
	FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import { Contact } from "../../contacts/types";

const CONTACTS_COLLECTION_NAME = "contacts";
const CONTACTS_LIST_COLLECTION_NAME = "list";

export const _saveContact = async (
	owner: string,
	contact: Omit<Contact, "id">
) => {
	const key = owner;
	const contacts = await firestore().collection<Contact>(
		CONTACTS_COLLECTION_NAME
	);

	const getMessagesCollection = async () => {
		const doc = await contacts.doc(key).get();
		if (doc.exists) {
			return contacts.doc(key).collection(CONTACTS_LIST_COLLECTION_NAME);
		} else {
			return contacts.doc(key).collection(CONTACTS_LIST_COLLECTION_NAME);
		}
	};

	const messagesCollection = await getMessagesCollection();
	const doc = await messagesCollection.doc().get();
	await messagesCollection.doc(doc.id).set({ id: doc.id, ...contact });
	return true;
};

export const _getContacts = async (owner: string, limit: number) => {
	const key = owner;
	const contacts = await firestore()
		.collection<Contact>(CONTACTS_COLLECTION_NAME)
		.doc(key)
		.collection(CONTACTS_LIST_COLLECTION_NAME)
		.orderBy("alias")
		.limit(limit)
		.get();

	return contacts.docs.map((x) => x.data() as Contact);
};

export const _getContactByAlias = async (owner: string, alias: string) => {
	// TODO: improve to don't search through the full collection locally
	const key = owner;
	const contacts = await firestore()
		.collection<Contact>(CONTACTS_COLLECTION_NAME)
		.doc(key)
		.collection(CONTACTS_LIST_COLLECTION_NAME)
		.orderBy("alias")
		.get();

	return contacts.docs
		.map((x) => x.data() as Contact)
		.filter((x) => x.alias.toLowerCase() == alias.toLowerCase());
};

export const _getContactsSnapshot = (
	address: string,
	limit: number,
	next: (snapshot: Contact[]) => void,
	error: (error: Error) => void
) => {
	const subscription = firestore()
		.collection<Contact>(CONTACTS_COLLECTION_NAME)
		.doc(address)
		.collection(CONTACTS_LIST_COLLECTION_NAME)
		.orderBy("alias")
		.limit(limit)
		.onSnapshot({
			next: (
				querySnapshot: FirebaseFirestoreTypes.QuerySnapshot<FirebaseFirestoreTypes.DocumentData>
			) => {
				console.log("querySnapshot", querySnapshot);
				next(querySnapshot.docs.map((x) => x.data()) as Contact[]);
			},
			error,
		});

	return subscription;
};

export const _deleteContact = async (address: string, id: string) => {
	return await firestore()
		.collection<Contact>(CONTACTS_COLLECTION_NAME)
		.doc(address)
		.collection(CONTACTS_LIST_COLLECTION_NAME)
		.doc(id)
		.delete();
};

export const _updateContact = async (
	address: string,
	id: string,
	contactData: Contact
) => {
	return await firestore()
		.collection<Contact>(CONTACTS_COLLECTION_NAME)
		.doc(address)
		.collection(CONTACTS_LIST_COLLECTION_NAME)
		.doc(id)
		.set(contactData);
};
