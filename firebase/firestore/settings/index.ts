import firestore, {
	FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import { Settings } from "../../settings/types";

const SETTINGS_COLLECTION_NAME = "settings";

export const _saveSettings = async (
	user: string,
	settings: Partial<Settings>
) => {
	const collection = await firestore().collection<Partial<Settings>>(
		SETTINGS_COLLECTION_NAME
	);

	const doc = await collection.doc(user).get();
	if (doc.exists) {
		return collection.doc(user).set(settings, { merge: true });
	} else {
		return collection.doc(user).set(settings);
	}
};

export const _getSettings = async (user: string) => {
	const collection = await firestore().collection<Partial<Settings>>(
		SETTINGS_COLLECTION_NAME
	);

	const doc = await collection.doc(user).get();
	return doc.data() as Partial<Settings>;
};

export const _getSettingsSnapshot = (
	user: string,
	next: (snapshot: Partial<Settings>) => void,
	error: (error: Error) => void
) => {
	const subscription = firestore()
		.collection<Partial<Settings>>(SETTINGS_COLLECTION_NAME)
		.doc(user)
		.onSnapshot({
			next: (
				snapshot: FirebaseFirestoreTypes.DocumentSnapshot<Partial<Settings>>
			) => {
				next(snapshot.data() || {});
			},
			error,
		});

	return subscription;
};
