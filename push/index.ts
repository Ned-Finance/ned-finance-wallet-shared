import messaging from "@react-native-firebase/messaging";
import { logError, logInfo } from "../common/logging";
import { savePushToken } from "../firebase/firestore/pushtokens";

const meta = {
	file: "utils/push/index.ts",
};

export const getPushTokenAndSave = async (address: string) => {
	logInfo({
		message: `Trying to get a device token`,
		meta,
	});
	const token = await getPushToken();
	if (token) {
		logInfo({
			message: `Token obtained = ${token}, wallet value = ${address}`,
			meta,
		});
		// if (token && wallet && wallet.address)
		await savePushToken(address, token);
	} else {
		logError({
			message: `Couldn't get push token for address ${address}`,
			meta,
		});
	}
};

export const getPushToken = async () => {
	if (!messaging().isDeviceRegisteredForRemoteMessages) {
		await messaging().registerDeviceForRemoteMessages();
	}
	const token = await messaging().getToken();
	return token;
};
