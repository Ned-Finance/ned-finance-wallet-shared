import { PublicKey } from "@metaplex-foundation/js";
import {
	Metadata,
	PROGRAM_ADDRESS,
} from "@metaplex-foundation/mpl-token-metadata";
import { Connection } from "@solana/web3.js";
import axios from "axios";

export const getNftMetadataFromUri = async (uri: string) => {
	try {
		const req = await axios.get(uri.replace(/[^a-zA-Z0-9 \.\:\/\-\_]/g, ""));

		return req.data;
	} catch (e) {
		console.log("err on getNftMetadataFromUri", e.request);
	}

	// console.log('b ', await b.json())

	// console.log('getNftMetadataFromUri: calling uri', uri)
	// const headers = {
	//     "Accept": "*/*",
	//     "Accept-Language": "en-US,en;q=0.6",
	//     "Cache-Control": "no-cache",
	//     "Pragma": "no-cache",
	//     "Sec-Ch-Ua": "\"Not/A)Brand\";v=\"99\", \"Brave\";v=\"115\", \"Chromium\";v=\"115\"",
	//     "Sec-Ch-Ua-Mobile": "?0",
	//     "Sec-Ch-Ua-Platform": "\"macOS\"",
	//     "Sec-Fetch-Dest": "empty",
	//     "Sec-Fetch-Mode": "cors",
	//     "Sec-Fetch-Site": "cross-site",
	//     "Sec-Gpc": "1"
	// }
	// try {
	//     const { data } = await axios.get(uri, {
	//         headers,
	//         withCredentials: false
	//     })
	//     return data
	// } catch (err) {
	//     console.log('err on getNftMetadataFromUri', (err as AxiosError).response)
	//     return {}
	// }
};

export const getMetadataFromAddress = async (
	connection: Connection,
	mint: string
) => {
	const [publicKey] = await PublicKey.findProgramAddressSync(
		[
			Buffer.from("metadata"),
			new PublicKey(PROGRAM_ADDRESS).toBuffer(),
			new PublicKey(mint).toBuffer(),
		],
		new PublicKey(PROGRAM_ADDRESS)
	);

	console.log("publicKey", publicKey);

	const metadataPDA = await Metadata.fromAccountAddress(connection, publicKey);

	return metadataPDA;
};
