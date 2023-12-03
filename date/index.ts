import dayjs from "dayjs";

export const timestampToDateString = (timestamp: number, format: string) =>
	dayjs.unix(timestamp).format(format);
