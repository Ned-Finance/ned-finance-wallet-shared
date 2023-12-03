export type LogMetaBase = {
	[key: string]: LogAllowedValue;
} & ({ screenName: string } | { file: string });

export type LogMessageBase = {
	message: string;
	meta: LogMetaBase;
};

export type LogAllowedValue = string | number | boolean;

// These are lower case for compatibility with backend standards (i.e. python)
export type LogScreenViewMessage = {} & LogMessageBase;

export type LogTapMessage = {
	meta: {
		nextScreen?: string;
		buttonValue: string;
	} & LogMetaBase;
} & LogMessageBase;

export type LogSystemMessage = {} & LogMessageBase;

export type LogExceptionMessage = {
	capturedError: Error;
} & LogMessageBase;

export type LogErrorMessage = {} & LogMessageBase;
