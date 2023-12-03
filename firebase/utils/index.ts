import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import _ from "lodash";

export const getUserNodeFromCollection = async (
	collection: FirebaseFirestoreTypes.CollectionReference<any>,
	user: string
) => {
	const doc = collection.doc(user);
	const ref = await doc.get();
	if (ref.exists) {
		return doc;
	} else {
		await doc.set({});
		return doc;
	}
};

export const removeUndefinedFromObject = (
	value: object,
	iteratee: (key: string, value: any) => boolean
): object => {
	var cb = (v: object) => removeUndefinedFromObject(v, iteratee);
	return _.isObject(value)
		? _.isArray(value)
			? _.map(value, cb)
			: _(value).omitBy(iteratee).mapValues(cb).value()
		: value;
};
