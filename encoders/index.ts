import { camelCase, isArray, isObject, transform } from "lodash";

const FLAG_TYPED_ARRAY = "FLAG_TYPED_ARRAY";
var context = typeof window === "undefined" ? global : window;

export const JSONEncode = (object: any) =>
	JSON.stringify(object, (key: any, value: any) => {
		// the replacer function is looking for some typed arrays.
		// If found, it replaces it by a trio
		if (value instanceof Uint8Array) {
			var replacement = {
				constructor: value.constructor.name,
				data: Array.apply([], value as never),
				flag: FLAG_TYPED_ARRAY,
			};
			return replacement;
		}
		return value;
	});

export const JSONDecode = (str: string) =>
	JSON.parse(str, (key: any, value: any) => {
		// the reviver function looks for the typed array flag
		try {
			if ("flag" in value && value.flag === FLAG_TYPED_ARRAY) {
				// if found, we convert it back to a typed array
				return new context[value.constructor](value.data);
			}
		} catch (e) {}

		// if flag not found no conversion is done
		return value;
	});

export const camelizeDeep = (obj: Record<string, unknown>) =>
	transform(
		obj,
		(result: Record<string, unknown>, value: unknown, key: string, target) => {
			const camelKey = isArray(target) ? key : camelCase(key);
			result[camelKey] = isObject(value)
				? camelizeDeep(value as Record<string, unknown>)
				: value;
		}
	);

// const convertToCamelDeep = (item: unknown): unknown => {
// 	if (Array.isArray(item)) {
// 		return item.map((el: unknown) => convertToCamelDeep(el));
// 	} else if (typeof item === "function" || item !== Object(item)) {
// 		return item;
// 	}
// 	return Object.fromEntries(
// 		Object.entries(item as Record<string, unknown>).map(
// 			([key, value]: [string, unknown]) => [
// 				key.replace(/([-_][a-z])/gi, (c) =>
// 					c.toUpperCase().replace(/[-_]/g, "")
// 				),
// 				convertToCamelDeep(value),
// 			]
// 		)
// 	);
// };
