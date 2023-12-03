import colors from "@colors/colors";
import analytics from "@react-native-firebase/analytics";
import _ from "lodash";
import { match } from "ts-pattern";
import winston, { format } from "winston";
import {
	LOG_ERROR,
	LOG_EXCEPTION,
	LOG_SCREEN_VIEW,
	LOG_SYSTEM,
	LOG_SYSTEM_DEBUG,
	LOG_TAP,
} from "./constants";
import { LogDefaults } from "./defaults";
import { FirebaseTransport } from "./transports/analytics";
import {
	LogErrorMessage,
	LogExceptionMessage,
	LogScreenViewMessage,
	LogSystemMessage,
	LogTapMessage,
} from "./types";
const inspect = require("util").inspect;

const objectColorized = (message: any) => {
	if (message)
		if (_.isPlainObject(message) || _.isObject(message))
			return inspect(message, false, 6, true);
		else return message;
	else return message;
};

const logFormat = format.printf((info) => {
	const { level, message, label, timestamp } = info;

	const colorizedMessage = objectColorized(message);
	// const colorizedMessageMeta = objectColorized(meta)
	const separator = _.isObject(message) ? "\n" : "";

	// const SPLAT = Symbol.for('splat')
	// const splat = info[SPLAT]
	// console.log('splat', splat)

	return `${colors.yellow(
		timestamp
	)} [${label}] ${level}: ${separator} ${colorizedMessage}`;
});

const loggerFormat = format.combine(
	format.colorize(),
	format.label({ label: "NED" }),
	format.splat(),
	format.timestamp(),
	logFormat
);

const logger = winston.createLogger({
	level: process.env.NODE_ENV == "production" ? "info" : "debug",
	format: format.simple(),
	transports: [],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
logger.add(new FirebaseTransport({ level: "info" }));
logger.add(
	new winston.transports.Http({
		host: "logs.collector.solarwinds.com",
		path: "/v1/log",
		auth: {
			username: new String(""),
			password: "OOXx9paNb3tIuegQfplQpVLCUR8W",
		},
		level: "info",
		ssl: true,
	})
);

if (process.env.NODE_ENV !== "production") {
	logger.add(
		new winston.transports.Console({
			format: loggerFormat,
		})
	);
}

const convertToSnakeCase = (data: object) => {
	return _.mapKeys(data, (value, key) => {
		return _.snakeCase(key);
	});
};

type Level = "info" | "debug";
export const logDebug = (data: LogSystemMessage) => {
	logSystem(data, "debug");
};
export const logInfo = (data: LogSystemMessage) => {
	logSystem(data, "info");
};
const logSystem = (data: LogSystemMessage, level: Level) => {
	// Log debug is not sent to logging server
	const fn = match(level)
		.with("info", (level: string) => appLogger.info)
		.with("debug", (level: string) => appLogger.debug)
		.exhaustive();

	const eventName = match(level)
		.with("info", (level: string) => LOG_SYSTEM)
		.with("debug", (level: string) => LOG_SYSTEM_DEBUG)
		.exhaustive();

	const messagePrefix = match(data.meta)
		.when(
			(meta) => !_.isNil(meta.screenName),
			() => `screen:${data.meta.screenName}`
		)
		.when(
			(meta) => !_.isNil(meta.file),
			() => `file:${data.meta.file}`
		)
		.otherwise((meta) => "unidenfitied");

	const message = `[${messagePrefix}] ${data.message}`;

	const firstLevel = convertToSnakeCase(_.omit(data, ["meta", "message"]));
	const metaLevel = convertToSnakeCase(_.pick(data, "meta"));

	const logDefaults = LogDefaults.ref().getAll();

	fn({
		eventName,
		...{
			...firstLevel,
			...{ meta: { ...(metaLevel.meta as object), ...logDefaults } },
			message,
		},
	});
};

export const logTap = (data: LogTapMessage) => {
	const logDefaults = LogDefaults.ref().getAll();
	data.meta = { ...data.meta, ...logDefaults };
	appLogger.info({
		eventName: LOG_TAP,
		...convertToSnakeCase(data),
	});
};

export const logScreenView = (data: LogScreenViewMessage) => {
	const logDefaults = LogDefaults.ref().getAll();
	const neededProperties = {
		screen_class: data.meta.screenName,
		screen_name: data.meta.screenName,
	};
	data.meta = { ...data.meta, ...logDefaults };
	appLogger.info({
		eventName: LOG_SCREEN_VIEW,
		...convertToSnakeCase({ ...data, ...neededProperties }),
	});
};

export const logException = (data: LogExceptionMessage) => {
	appLogger.error({
		eventName: LOG_EXCEPTION,
		...convertToSnakeCase(data),
	});
};

export const logError = (data: LogErrorMessage) => {
	appLogger.error({
		eventName: LOG_ERROR,
		...convertToSnakeCase(data),
	});
};

export const setRandomIdentifierForLogging = (str: string) =>
	analytics().setUserProperty("random_identifier", str);

export const setAddressForLogging = (address: string) =>
	analytics().setUserProperty("wallet_address", address);

export const setBlockchainForLogging = (blockchain: string) =>
	analytics().setUserProperty("blockchain", blockchain);

export const appLogger = logger;
