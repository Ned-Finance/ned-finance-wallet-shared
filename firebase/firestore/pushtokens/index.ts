import firestore from "@react-native-firebase/firestore";
import { logInfo } from "../../common/logging";

const DEVICE_TOKENS_COLLECTION_NAME = "device-tokens";

const meta = {
	file: "utils/firebase/firestore/pushtokens/index.ts",
};

export const savePushToken = async (user: string, token: string) => {
	logInfo({
		message: `Saving token ${token} on firestore for ${user}`,
		meta,
	});
	const collection = await firestore().collection(
		DEVICE_TOKENS_COLLECTION_NAME
	);
	return collection.doc(user).set({ token, mobile: true });
};
