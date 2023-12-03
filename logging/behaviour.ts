import crashlytics from "@react-native-firebase/crashlytics";

export const log = (message: string) => {
	crashlytics().log(message);
};

export const setUserId = (userId: string) => {
	crashlytics().setUserId(userId);
};

export const setAttribute = (name: string, value: string) => {
	crashlytics().setAttribute(name, value);
};

export const setAttributes = (attributes: { [key: string]: string }) => {
	crashlytics().setAttributes(attributes);
};

export const recordError = (error: Error, jsErrorName?: string) => {
	crashlytics().recordError(error, jsErrorName);
};
