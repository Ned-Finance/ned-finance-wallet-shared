const PromiseWithFallback = <T>(prom: Promise<T>, time: number, exception: Error) => {
    let timer: any;
    return Promise.race([
        prom,
        new Promise((_r, rej) => timer = setTimeout(rej, time, exception))
    ]).finally(() => clearTimeout(timer));
}