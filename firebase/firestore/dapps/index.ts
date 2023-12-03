import firestore, {
	FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import _ from "lodash";
import { ConnectedDapp, Dapp } from "../../dapps/types";
import { getUserNodeFromCollection } from "../../utils";

const DAPPS_COLLECTION_NAME = "dapps";
const CONNECTED_DAPPS_COLLECTION_NAME = "connected-dapps";
const CONNECTED_DAPPS_COLLECTION_NAME_DAPPS = "dapps";

export const _getDappsSnapshot = (
	next: (snapshot: Dapp[]) => void,
	error: (error: Error) => void
) => {
	const subscription = firestore()
		.collection<Dapp>(DAPPS_COLLECTION_NAME)
		.limit(100)
		.onSnapshot({
			next: (
				querySnapshot: FirebaseFirestoreTypes.QuerySnapshot<FirebaseFirestoreTypes.DocumentData>
			) => {
				next(querySnapshot.docs.map((x) => x.data()) as Dapp[]);
			},
			error,
		});

	return subscription;
};

export const _getConnectedDappByUrl = async (user: string, url: string) => {
	const collection = await firestore().collection<ConnectedDapp>(
		CONNECTED_DAPPS_COLLECTION_NAME
	);

	const userNode = await getUserNodeFromCollection(collection, user);
	const dapp = await userNode
		.collection(CONNECTED_DAPPS_COLLECTION_NAME_DAPPS)
		.where("domain", "==", url)
		.where("deleted", "==", false)
		.get();

	return _.first(dapp.docs.map((d) => d.data()));
};

export const _saveConnectedDapp = async (
	user: string,
	connectedDapp: Omit<
		ConnectedDapp,
		"id" | "date" | "deleted" | "deletedAt"
	> & {
		id?: string;
		date?: number;
	}
) => {
	firestore().runTransaction(
		async (transaction: FirebaseFirestoreTypes.Transaction) => {
			const collection = await firestore().collection<Partial<ConnectedDapp>>(
				CONNECTED_DAPPS_COLLECTION_NAME
			);

			const userNode = await getUserNodeFromCollection(collection, user);
			const collectionDapps = userNode.collection(
				CONNECTED_DAPPS_COLLECTION_NAME_DAPPS
			);

			const newNode = await collectionDapps.add({});
			await newNode.set({
				...connectedDapp,
				id: newNode.id,
				date: Date.now(),
				deleted: false,
			});
		}
	);
};

export const _deleteConnectedDapp = async (
	user: string,
	connectedDappId: string
) => {
	const collection = await firestore().collection<Partial<ConnectedDapp>>(
		CONNECTED_DAPPS_COLLECTION_NAME
	);

	const userNode = await getUserNodeFromCollection(collection, user);
	await userNode
		.collection(CONNECTED_DAPPS_COLLECTION_NAME_DAPPS)
		.doc(connectedDappId)
		.update({ deleted: true, deletedAt: Date.now() });
};

export const _getConnectedDapps = async (user: string) => {
	const collection = await firestore().collection<Partial<ConnectedDapp>>(
		CONNECTED_DAPPS_COLLECTION_NAME
	);
	const userNode = await getUserNodeFromCollection(collection, user);
	const userCollection = await userNode
		.collection(CONNECTED_DAPPS_COLLECTION_NAME_DAPPS)
		.where("deleted", "==", false)
		.get();
	return userCollection.docs.map(
		(d) => ({ ...d.data(), id: d.id }) as ConnectedDapp
	);
};

export const _getConnectedDappsSnapshot = (
	user: string,
	next: (snapshot: ConnectedDapp[]) => void,
	error: (error: Error) => void
) => {
	const subscription = firestore()
		.collection<ConnectedDapp>(CONNECTED_DAPPS_COLLECTION_NAME)
		.doc(user)
		.collection(CONNECTED_DAPPS_COLLECTION_NAME_DAPPS)
		.where("deleted", "==", false)
		.onSnapshot({
			next: (
				snapshot: FirebaseFirestoreTypes.QuerySnapshot<Partial<ConnectedDapp>>
			) => {
				const dapps = snapshot.docs.map(
					(d) => ({ ...d.data(), id: d.id }) as ConnectedDapp
				);
				next(dapps || []);
			},
			error,
		});

	return subscription;
};
