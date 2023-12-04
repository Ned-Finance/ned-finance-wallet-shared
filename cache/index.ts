export class Cache {
	private static instance: Cache;

	/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
	private _obj: { [key: string]: any } = {};

	private constructor() {}

	public static ref(): Cache {
		if (!Cache.instance) {
			Cache.instance = new Cache();
		}

		return Cache.instance;
	}

	/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
	public set(key: string, value: any) {
		/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
		this._obj[key] = value;
	}
	public get<T>(key: string): T {
		return this._obj[key] as T;
	}
}
