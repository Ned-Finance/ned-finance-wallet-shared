
export class Cache {
    private static instance: Cache;

    private _obj: { [key: string]: any } = {}

    private constructor() { }

    public static ref(): Cache {
        if (!Cache.instance) {
            Cache.instance = new Cache();
        }

        return Cache.instance;
    }

    public set(key: string, value: any) {
        this._obj[key] = value
    }
    public get<T>(key: string): T {
        return this._obj[key] as T
    }
}