import axios from "axios";
import { getConnection } from "../../connection";
// import { GetAssetsByOwnerProps, GetAssetsByOwnerRpcInput } from "./types";
import {
	GetAssetProofRpcResponse,
	GetAssetsByOwnerRpcInput,
	ReadApiAssetList,
} from "@metaplex-foundation/js";

const connection = getConnection();

//
export const getAssetsByOwner = async ({
	ownerAddress,
	page = 100,
	limit,
}: GetAssetsByOwnerRpcInput): Promise<ReadApiAssetList> => {
	console.log("ownerAddress", ownerAddress);
	const requestData = {
		jsonrpc: "2.0",
		id: "rpd-op-123",
		method: "getAssetsByOwner",
		params: {
			ownerAddress,
			after: null,
			before: null,
			limit: limit ?? null,
			page: page ?? 1,
			sortBy: null,
		},
	};

	// console.log("connection.rpcEndpoint", connection.rpcEndpoint);

	const response = await axios.post(connection.rpcEndpoint, requestData);
	console.log("getAssetsByOwner", response.data);
	return response.data.result;
};

export const getAssetProof = async (
	assetId: string
): Promise<GetAssetProofRpcResponse> => {
	const { data } = await axios.post<GetAssetProofRpcResponse>(
		connection.rpcEndpoint,
		{
			method: "getAssetProof",
			params: {
				id: assetId,
			},
		}
	);

	return data;
};
