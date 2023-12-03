export class LogDefaults {
	private static instance: LogDefaults;

	private _obj: { [key: string]: any } = {};

	private constructor() {}

	public static ref(): LogDefaults {
		if (!LogDefaults.instance) {
			LogDefaults.instance = new LogDefaults();
		}

		return LogDefaults.instance;
	}

	public set(key: string, value: string | number | boolean) {
		this._obj[key] = value;
	}
	public get(key: string): string | number | boolean {
		return this._obj[key] as string | number | boolean;
	}
	public getAll() {
		return this._obj;
	}
	public delete<T>(key: string) {
		delete this._obj[key];
	}
}
