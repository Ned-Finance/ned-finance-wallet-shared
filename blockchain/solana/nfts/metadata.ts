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
		console.log("err on getNftMetadataFromUri", e);
	}
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
