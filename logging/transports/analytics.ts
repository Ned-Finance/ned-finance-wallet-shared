import TransportStream = require("winston-transport");
import analytics from "@react-native-firebase/analytics";
import crashlytics from "@react-native-firebase/crashlytics";
import * as Sentry from "@sentry/react-native";
import { captureException } from "@sentry/react-native";
import { LOG_EXCEPTION, LOG_SCREEN_VIEW } from "../constants";

type FirebaseMessage = {
	message: string;
	eventName: string;
	meta: {
		capturedError?: Error;
	};
};

//
// Inherit from `winston-transport` so you can take advantage
// of the base functionality and `.exceptions.handle()`.
//
export class FirebaseTransport extends TransportStream {
	constructor(opts: TransportStream.TransportStreamOptions = {}) {
		super(opts);
		//
		// Consume any custom options here. e.g.:
		// - Connection information for databases
		// - Authentication information for APIs (e.g. loggly, papertrail,
		//   logentries, etc.).
		//
	}

	async log(info: FirebaseMessage, callback: () => void) {
		setImmediate(() => {
			this.emit("logged", info);
		});

		const { message, eventName, meta = { capturedError: null } } = info;

		if (eventName) {
			switch (eventName) {
				// case LOG_SYSTEM:
				// case LOG_ERROR:
				// case LOG_TAP: {
				// 	await analytics().logEvent(eventName, { ...meta, message });
				// 	break;
				// }
				case LOG_SCREEN_VIEW: {
					await analytics().logScreenView({
						screen_class: "ProductScreen",
						screen_name: "ProductScreen",
					});

					break;
				}
				case LOG_EXCEPTION: {
					if (meta.capturedError) {
						captureException(meta.capturedError); // Delete when removing Sentry
						await crashlytics().recordError(meta.capturedError);
						await Sentry.captureException(meta.capturedError); // TODO: remove this
					}
					const metaWithoutError = { ...meta };
					delete metaWithoutError.capturedError;
					await analytics().logEvent(eventName, {
						...metaWithoutError,
						message,
					});
					break;
				}
			}
		}

		// Perform the writing to the remote service
		return callback();
	}
}
