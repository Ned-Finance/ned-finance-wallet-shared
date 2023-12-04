// import {
// 	SolanaNFTCollection,
// 	SolanaNFTCollectionItem,
// } from "../..//common/nfts/interfaces";
import {
	Metaplex,
	ReadApiAsset,
	ReadApiAssetList,
	keypairIdentity,
} from "@metaplex-foundation/js";
import {
	getAssetWithProof,
	mplBubblegum,
	transfer,
} from "@metaplex-foundation/mpl-bubblegum";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
	fromWeb3JsPublicKey,
	toWeb3JsPublicKey,
} from "@metaplex-foundation/umi-web3js-adapters";
import {
	Connection,
	Keypair,
	PublicKey,
	TransactionMessage,
	VersionedTransaction,
} from "@solana/web3.js";
import * as _ from "lodash";
import { getAccountAddress } from "../accounts";
import { getSendTransaction } from "../transactions/helpers";
import { getAssetsByOwner } from "./compressed";
import { MagicEdenManager } from "./magic_eden/manager";
import { SolanaNFTCollection, SolanaNFTCollectionItem } from "./types";

export class NftManager {
	private _connection!: Connection;
	private _metaplex!: Metaplex;

	constructor(connection: Connection, keypair?: Keypair) {
		this._connection = connection;
		this._metaplex = new Metaplex(connection);
		if (keypair) this._metaplex.use(keypairIdentity(keypair));
	}

	get metaplex() {
		return this._metaplex;
	}

	// getMintAddress = (nft: NFTMetaplex): string => {
	// 	return match({ nft: nft })
	// 		.with({ nft: P.when((nft) => nft.model == "metadata") }, ({ nft }) => {
	// 			return (nft as Metadata).mintAddress.toBase58();
	// 		})
	// 		.with({ nft: P.when((nft) => nft.model == "nft") }, ({ nft }) => {
	// 			return (nft as Nft).mint.address.toBase58();
	// 		})
	// 		.run();
	// };

	// getMetadataAddress = (nft: NFTMetaplex): string => {
	// 	return match({ nft: nft })
	// 		.with({ nft: P.when((nft) => nft.model == "metadata") }, ({ nft }) => {
	// 			return (nft as Metadata).address.toBase58();
	// 		})
	// 		.with({ nft: P.when((nft) => nft.model == "nft") }, ({ nft }) => {
	// 			return (nft as Nft).metadataAddress.toBase58();
	// 		})
	// 		.run();
	// };

	// convertMetaplexNFT(nfts: NFTMetaplex[]) {
	// 	return nfts.map((nft) => {
	// 		// const metadata = nft as Metadata
	// 		const item = {
	// 			model: nft.model,
	// 			address: this.getMetadataAddress(nft), //metadata.address.toBase58(),
	// 			mintAddress: this.getMintAddress(nft),
	// 			updateAuthorityAddress: nft.updateAuthorityAddress.toBase58(),
	// 			name: nft.name,
	// 			symbol: nft.symbol,
	// 			uri: nft.uri,
	// 			isMutable: nft.isMutable,
	// 			primarySaleHappened: nft.primarySaleHappened,
	// 			listed: nft.listed,
	// 		} as SolanaNFTCollectionItem;
	// 		return {
	// 			item,
	// 			network: Network.Solana,
	// 		} as SolanaNFTCollectionItem;
	// 	});
	// }

	// async getNFTSWithCollection(
	// 	groupedByMint: _.Dictionary<Array<NFTMetaplex>>,
	// 	mintKeys: string[]
	// ) {
	// 	const mints = _.map(mintKeys, (mint) => new PublicKey(mint));

	// 	const collections = (
	// 		await this._metaplex.nfts().findAllByMintList({ mints })
	// 	).filter((x) => x != null) as NFTMetaplex[];

	// 	// console.log(JSON.stringify(collections, undefined, 2))

	// 	const collectionsSorted = _.sortBy(collections, "name");

	// 	const promises = collectionsSorted.map((collection) => {
	// 		return new Promise<SolanaNFTCollection | null>(
	// 			async (resolve, reject) => {
	// 				try {
	// 					const { data } = await axios.get(collection.uri);
	// 					const solanaCollection = {
	// 						name: data.name,
	// 						symbol: collection.symbol,
	// 						description: data.description,
	// 						mintAddress: (collection as Metadata).mintAddress.toBase58(),
	// 						address: collection.address.toBase58(),
	// 						updateAuthorityAddress:
	// 							collection.updateAuthorityAddress.toBase58(),
	// 						creators: collection.creators.map((x) => {
	// 							return {
	// 								address: x.address.toBase58(),
	// 								verified: x.verified,
	// 								share: x.share,
	// 							};
	// 						}),
	// 						uri: collection.uri,
	// 						image: data.image,
	// 					} as SolanaNFTCollection;

	// 					resolve(solanaCollection);
	// 				} catch (err) {
	// 					console.log("Error on getNFTSWithCollection");
	// 					resolve(null);
	// 				}
	// 			}
	// 		);
	// 	});

	// 	const collectionsWithMetadata: SolanaNFTCollection[] = (
	// 		await Promise.all(promises)
	// 	).filter((x) => x != null) as SolanaNFTCollection[];

	// 	const collectionsWithNFTs = _.map(collectionsWithMetadata, (collection) => {
	// 		const nfts = groupedByMint[collection.mintAddress];
	// 		const nftItems = this.convertMetaplexNFT(nfts);

	// 		// console.log('collection ==>', collection)
	// 		// console.log('items ==>', nftItems)
	// 		// console.log('==================================')

	// 		return {
	// 			collection,
	// 			items: nftItems,
	// 			network: Network.Solana,
	// 		} as SolanaNFTCollection;
	// 	});

	// 	return collectionsWithNFTs;
	// }

	// async getNFTSWithoutCollection(groupedByMint: {
	// 	[key: string]: NFTMetaplex[];
	// }): Promise<SolanaNFTCollection[]> {
	// 	const groupByUpdateAuthority = _.groupBy(
	// 		groupedByMint["undefined"] || [],
	// 		"updateAuthorityAddress"
	// 	);

	// 	const nftsWithoutCollections = _.transform(
	// 		groupByUpdateAuthority,
	// 		(acc, nfts, key) => {
	// 			const promise = new Promise(async (resolve, reject) => {
	// 				const firstNFT = _.first(nfts)!;
	// 				const [groupNameFromNFT] = firstNFT.name.match(
	// 					/^[\w\s]+/g
	// 				) as string[];
	// 				const cleanedName = groupNameFromNFT.replace(/(NFT|nft)/g, "").trim();

	// 				console.log("firstNFT", firstNFT);

	// 				const collectionPartial = {
	// 					name: cleanedName,
	// 					symbol: "",
	// 					description: "",
	// 					mintAddress: "",
	// 					address: "",
	// 					updateAuthorityAddress: "",
	// 					creators: firstNFT.creators.map((x) => {
	// 						return {
	// 							address: x.address.toBase58(),
	// 							verified: x.verified,
	// 							share: x.share,
	// 						};
	// 					}),
	// 					uri: "",
	// 				} as Partial<SolanaNFTCollection>;

	// 				try {
	// 					const { data } = await axios.get(firstNFT.uri);

	// 					const collection = {
	// 						...collectionPartial,
	// 						image: data.image,
	// 					} as SolanaNFTCollection;

	// 					const nftItems = this.convertMetaplexNFT(nfts);
	// 					const nftCollection = {
	// 						collection,
	// 						items: nftItems,
	// 						network: Network.Solana,
	// 					} as SolanaNFTCollection;

	// 					resolve(nftCollection);
	// 				} catch (err) {
	// 					const collection = {
	// 						...collectionPartial,
	// 						image: "",
	// 					} as SolanaNFTCollection;
	// 					resolve({
	// 						collection,
	// 						items: [],
	// 						network: Network.Solana,
	// 					});
	// 					console.log("Error on getNFTSWithoutCollection");
	// 				}
	// 			});
	// 			acc.push(promise as never);
	// 			return acc;
	// 		},
	// 		[]
	// 	);

	// 	return await Promise.all(nftsWithoutCollections);
	// }

	// public async loadCollections(address: string): Promise<SolanaNFTCollection[]> {
	// 	const assets = await getAssetsByOwner({
	// 		ownerAddress: address,
	// 		page: 1,
	// 		limit: 20,
	// 	});

	// 	console.log("asetsasetsasetsasets", assets);
	// 	assets.items.forEach((a) =>
	// 		console.log("--->", JSON.stringify(a, undefined, 2))
	// 	);

	// 	const metaplexNFTsPromise: Promise<NFTMetaplex[]> = this._metaplex
	// 		.nfts()
	// 		.findAllByOwner({
	// 			owner: new PublicKey(address),
	// 		})
	// 		.then((result) =>
	// 			result.map((item) => {
	// 				return {
	// 					...item,
	// 					listed: false,
	// 				};
	// 			})
	// 		);

	// 	const meNFTsPromise: Promise<NFTMetaplex[]> = MagicEdenManager.getInstance()
	// 		.getListedNFTsForWallet(address)
	// 		.then((result) =>
	// 			result.map((item) => {
	// 				return {
	// 					...item,
	// 					listed: true,
	// 				};
	// 			})
	// 		);

	// 	const [nfts, meNfts] = await Promise.all([
	// 		metaplexNFTsPromise,
	// 		meNFTsPromise,
	// 	]);

	// 	// console.log('nfts ==>', JSON.stringify(nfts, undefined, 2))
	// 	// console.log('meNfts ==>', JSON.stringify(meNfts, undefined, 2))

	// 	const groupedByMint = await _.groupBy(nfts.concat(meNfts), (x) => {
	// 		if (x.collection) return x.collection.address.toBase58();
	// 		else return "undefined";
	// 	});

	// 	const mintKeys = _.keys(groupedByMint);
	// 	const [mintKeysWithCollection] = _.partition(
	// 		mintKeys,
	// 		(x) => x != "undefined"
	// 	);

	// 	const nftsWithCollection = await this.getNFTSWithCollection(
	// 		groupedByMint,
	// 		mintKeysWithCollection
	// 	);

	// 	const nftsWithoutCollection = await this.getNFTSWithoutCollection(
	// 		groupedByMint
	// 	);

	// 	return nftsWithCollection.concat(nftsWithoutCollection);
	// }

	private parseCollectionFromGrouped(
		grouped: {
			[key: string]: SolanaNFTCollectionItem[];
		},
		keyIsMint: boolean
	) {
		console.log("keyIsMint", keyIsMint);
		return _.transform(
			grouped,
			(acc, items, key) => {
				const promise = new Promise<SolanaNFTCollection>((resolve, reject) => {
					// const items = current.map((asset) => {

					// });

					const defaultCollection = {
						name: "",
						address: key,
						image: "",
						items: items,
					} as SolanaNFTCollection;

					if (keyIsMint) {
						return this._metaplex
							.nfts()
							.findByMint({
								mintAddress: new PublicKey(key),
							})
							.then((r) => {
								resolve({
									...defaultCollection,
									name: r.name,
									image: r.json?.image || items[0].name || "UNKNOWN",
								} as SolanaNFTCollection);
							})
							.catch((e) => resolve(defaultCollection));
					} else {
						const [groupNameFromNFT] = (items[0].name || "UNKNOWN").match(
							/^[\w\s]+/g
						) as string[];
						const cleanedName = groupNameFromNFT
							.replace(/(NFT|nft)/g, "")
							.trim();
						resolve({
							...defaultCollection,
							name: cleanedName,
							image: items[0].image || "UNKNOWN",
						} as SolanaNFTCollection);
					}
				});

				acc.push(promise);
				return acc;
			},
			[] as Promise<SolanaNFTCollection>[]
		);
	}

	private parseAssetToNFTItemCollection(asset: ReadApiAsset) {
		const files = ((asset.content as any)?.files || []) as {
			mime: string;
			uri: string;
		}[];

		console.log("asset", JSON.stringify(asset, undefined, 2));
		const imageFile = files.find(
			(f) =>
				["image/png", "image/jpg", "image/jpeg"].find((x) => x == f.mime) !=
				undefined
		);
		const image =
			asset.content.metadata?.image || (imageFile ? imageFile.uri : "");

		const collection =
			asset.grouping.length > 0 ? asset.grouping[0].group_value : undefined;
		const updateAuthority = asset.authorities.length
			? asset.authorities[0].address
			: undefined;

		return {
			address: asset.id,
			image: image,
			name: asset.content.metadata?.name,
			symbol: asset.content.metadata?.symbol,
			uri: asset.content.json_uri,
			listed: false,
			compression: asset.compression,
			collection,
			updateAuthority,
		};
	}

	public async loadCollections(
		address: string
	): Promise<SolanaNFTCollection[]> {
		const walletNftsPromise: Promise<ReadApiAssetList> = getAssetsByOwner({
			ownerAddress: address,
			page: 1,
			limit: 20,
		});

		const magicEdenNftsPromise: Promise<SolanaNFTCollectionItem[]> =
			MagicEdenManager.getInstance()
				.getListedNFTsForWallet(address)
				.then((result) =>
					result.map((item) => {
						return {
							...item,
							listed: true,
						};
					})
				);

		const [walletNfts, magicEdenNfts] = await Promise.all([
			walletNftsPromise,
			magicEdenNftsPromise,
		]);

		console.log("walletNfts", JSON.stringify(walletNfts, undefined, 2));

		const [withGroup, withoutGroup] = _.partition(
			[
				...walletNfts.items.map(this.parseAssetToNFTItemCollection),
				...magicEdenNfts,
			],
			(nft) => !_.isUndefined(nft.collection)
		);

		const groupedWithoutGroup = _.groupBy(
			withoutGroup,
			(nft) => nft.updateAuthority
		);
		const groupedWithGroup = _.groupBy(withGroup, (nft) => nft.collection);

		const nftColecttionsFromNonGroupedPromise = this.parseCollectionFromGrouped(
			groupedWithoutGroup,
			false
		);
		const nftColecttionsFromGroupedPromise = this.parseCollectionFromGrouped(
			groupedWithGroup,
			true
		);

		const [nftColecttionFromGrouped, nftColecttionFromNonGrouped] =
			await Promise.all([
				Promise.all(nftColecttionsFromGroupedPromise),
				Promise.all(nftColecttionsFromNonGroupedPromise),
			]);

		const allCollections = nftColecttionFromGrouped.concat(
			nftColecttionFromNonGrouped
		);

		return allCollections;
	}

	async getTransferTransaction(
		nft: SolanaNFTCollectionItem,
		from: Keypair,
		to: string
	) {
		if (nft.compression && nft.compression.compressed) {
			// Use the RPC endpoint of your choice.
			const umi = createUmi(this._connection.rpcEndpoint).use(mplBubblegum());
			const assetWithProof = await getAssetWithProof(
				umi,
				fromWeb3JsPublicKey(new PublicKey(nft.address))
			);
			const instructionsUmi = await transfer(umi, {
				...assetWithProof,
				leafOwner: fromWeb3JsPublicKey(from.publicKey),
				newLeafOwner: fromWeb3JsPublicKey(new PublicKey(to)),
			}).getInstructions();

			const instructions = instructionsUmi.map((instruction) => {
				const data = Buffer.from(instruction.data);
				const keys = instruction.keys.map((key) => {
					return { ...key, pubkey: toWeb3JsPublicKey(key.pubkey) };
				});
				return {
					data,
					keys,
					programId: toWeb3JsPublicKey(instruction.programId),
				};
			});

			const latestBlockhash =
				await this._connection.getLatestBlockhash("finalized");

			const messageV0 = new TransactionMessage({
				payerKey: from.publicKey,
				recentBlockhash: latestBlockhash.blockhash,
				instructions: instructions,
			}).compileToV0Message();

			const versionedTransaction = new VersionedTransaction(messageV0);
			versionedTransaction.sign([from]);

			return versionedTransaction;

			// const tx = await sendTransaction(versionedTransaction);

			// 	const tx = new Transaction().add(ix);
			// 	const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);

			// const transaction = VersionedTransaction.deserialize(
			// 	transactionBubblegum.serializedMessage
			// );
			// transaction.sign([from]);
			// return transaction;
		} else {
			const fromATAAddress = await getAccountAddress(
				from.publicKey.toBase58(),
				nft.address,
				from
			);
			const toATAAddress = await getAccountAddress(to, nft.address, from);

			return await getSendTransaction({
				fromAddress: fromATAAddress,
				mint: nft.address,
				decimals: 1,
				signer: from,
				toAddress: toATAAddress,
				amount: 1,
				tokenAddress: nft.address,
				feePayer: from.publicKey,
			});
		}
	}
}
