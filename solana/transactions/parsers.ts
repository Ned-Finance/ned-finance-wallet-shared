// import bs58 from 'bs58';
// import { SystemInstruction } from '@solana/web3.js';
// import { getCloseAccountData, getInitializeAccountData, getTransferData } from './helpers';


// export const parseSystemInstruction = (publicKey, instruction, accountKeys) => {
//     const { programIdIndex, accounts, data } = instruction;
//     if (!programIdIndex || !accounts || !data) {
//         return;
//     }

//     // construct system instruction
//     const systemInstruction = {
//         programId: accountKeys[programIdIndex],
//         keys: accounts.map((accountIndex) => ({
//             pubkey: accountKeys[accountIndex],
//         })),
//         data: bs58.decode(data),
//     };

//     // get layout
//     let decoded;
//     const type = SystemInstruction.decodeInstructionType(systemInstruction);
//     switch (type) {
//         case 'Create':
//             decoded = SystemInstruction.decodeCreateAccount(systemInstruction);
//             break;
//         case 'CreateWithSeed':
//             decoded = SystemInstruction.decodeCreateWithSeed(systemInstruction);
//             break;
//         case 'Allocate':
//             decoded = SystemInstruction.decodeAllocate(systemInstruction);
//             break;
//         case 'AllocateWithSeed':
//             decoded = SystemInstruction.decodeAllocateWithSeed(systemInstruction);
//             break;
//         case 'Assign':
//             decoded = SystemInstruction.decodeAssign(systemInstruction);
//             break;
//         case 'AssignWithSeed':
//             decoded = SystemInstruction.decodeAssignWithSeed(systemInstruction);
//             break;
//         case 'Transfer':
//             decoded = SystemInstruction.decodeTransfer(systemInstruction);
//             break;
//         case 'AdvanceNonceAccount':
//             decoded = SystemInstruction.decodeNonceAdvance(systemInstruction);
//             break;
//         case 'WithdrawNonceAccount':
//             decoded = SystemInstruction.decodeNonceWithdraw(systemInstruction);
//             break;
//         case 'InitializeNonceAccount':
//             decoded = SystemInstruction.decodeNonceInitialize(systemInstruction);
//             break;
//         case 'AuthorizeNonceAccount':
//             decoded = SystemInstruction.decodeNonceAuthorize(systemInstruction);
//             break;
//         default:
//             return;
//     }

//     if (
//         !decoded ||
//         (decoded.fromPubkey && !publicKey.equals(decoded.fromPubkey))
//     ) {
//         return;
//     }

//     return {
//         type: 'system' + type,
//         data: decoded,
//     };
// };



// export const parseTokenInstruction = (
//     publicKey,
//     accounts,
//     decodedInstruction,
//     accountKeys,
// ) => {
//     if (!decodedInstruction || Object.keys(decodedInstruction).length > 1) {
//         return;
//     }

//     // get data
//     const type = Object.keys(decodedInstruction)[0];
//     let data = decodedInstruction[type];
//     if (type === 'initializeAccount') {
//         const initializeAccountData = getInitializeAccountData(
//             publicKey,
//             accounts,
//             accountKeys,
//         );
//         data = { ...data, ...initializeAccountData };
//     } else if (type === 'transfer') {
//         const transferData = getTransferData(publicKey, accounts, accountKeys);
//         data = { ...data, ...transferData };
//     } else if (type === 'closeAccount') {
//         const closeAccountData = getCloseAccountData(
//             publicKey,
//             accounts,
//             accountKeys,
//         );
//         data = { ...data, ...closeAccountData };
//     }

//     return {
//         type,
//         data,
//     };
// };

import { TOKEN_PROGRAM_ID, getAccount } from '@solana/spl-token'
import web3, { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import _ from 'lodash'
import { getWSolAddressForAddress } from '../accounts'
import { getConnection } from '../connection'

export type READABLE_SWAP = 'SWAP'
export type READABLE_SEND = 'RECEIVE'
export type READABLE_RECEIVE = 'SEND'

export type READABLE_TRANSACTION_TYPE = READABLE_SEND | READABLE_RECEIVE | READABLE_SWAP

export interface ReadableTransaction {
    tx: string[],
    raw?: object,
    type: READABLE_TRANSACTION_TYPE,
    time: number
}

export interface ReadableTransfer extends ReadableTransaction {
    from: string,
    to: string,
    amount: number,
    amountString: string,
    info: object
}

export interface ReadableSwap extends ReadableTransaction {
    sendToken: string,
    infoSendToken: object,
    amountSendToken: number,
    amountWithDecimalsSendToken: number,
    receiveToken: string,
    infoReceiveToken: object,
    amountReceiveToken: number,
    amountWithDecimalsReceiveToken: number,
}


const getTokenTransfer = async (userAddress: string, transaction: web3.ParsedTransactionWithMeta, tokenList: any[]): Promise<ReadableTransaction | null> => {

    const tokenProgramInstruction = _.find(
        transaction.transaction.message.instructions, x => {
            return x.programId.toBase58() == TOKEN_PROGRAM_ID.toBase58()
        })

    if (tokenProgramInstruction) {
        const parsedInstruction = (tokenProgramInstruction as web3.ParsedInstruction)
        console.log('parsedInstruction.parsed', parsedInstruction.parsed)
        if (parsedInstruction.parsed) {
            const transferChecked = parsedInstruction.parsed['type'] == 'transferChecked'
            if (transferChecked) {
                const info = parsedInstruction.parsed['info']
                const tokenInfo = _.find(tokenList, x => {
                    return x.address == info.mint
                })
                console.log("info['mint']", info['mint'])
                const receiveAccountInfo = await getConnection().getTokenSupply(
                    new PublicKey(info['mint'])
                )
                if (receiveAccountInfo.value.uiAmount > 1) {
                    return <ReadableTransfer>{
                        tx: transaction.transaction.signatures,
                        time: transaction.blockTime,
                        raw: info,
                        type: info['authority'] != userAddress ? 'RECEIVE' : 'SEND',
                        from: info['source'],
                        to: info['destination'],
                        amount: info['tokenAmount']['uiAmount'],
                        amountString: info['tokenAmount']['uiAmountString'],
                        info: tokenInfo
                    }
                } else {
                    // NFT
                    return null
                }
            }
        }
    }
    return null
}

const getSolTransfer = async (userAddress: string, transaction: web3.ParsedTransactionWithMeta, tokenList: any[]): Promise<ReadableTransaction | null> => {
    if (transaction.transaction.message.instructions.length == 1) {
        const instruction = transaction.transaction.message.instructions[0]
        const parsedInstruction = (instruction as web3.ParsedInstruction)
        if (parsedInstruction.parsed) {
            const transfer = parsedInstruction.parsed['type'] == 'transfer'
            if (transfer) {
                const info = parsedInstruction.parsed['info']
                const tokenInfo = _.find(tokenList, x => {
                    return x.symbol.toLowerCase() == 'wsol'
                })
                return <ReadableTransfer>{
                    tx: transaction.transaction.signatures,
                    time: transaction.blockTime,
                    raw: info,
                    type: info['source'] != userAddress ? 'RECEIVE' : 'SEND',
                    from: info['source'],
                    to: info['destination'],
                    amount: info['lamports'] / LAMPORTS_PER_SOL,
                    info: tokenInfo
                }
            }
        }
    }
    return null
}

const getSolWrappedSwap = async (ata: string, userAddress: string, transaction: web3.ParsedTransactionWithMeta, tokenList: any[], wrappedSolAddress: string): Promise<ReadableTransaction | null> => {

    const connection = getConnection()

    const onlyInstructions = _.flatten(_.map(
        transaction.meta.innerInstructions, x => x.instructions))
    const onlyTransfers = _.filter(onlyInstructions, x => {
        const parsedInstruction = (x as web3.ParsedInstruction)
        if (parsedInstruction && parsedInstruction.parsed) {
            const isTokenProgram =
                parsedInstruction.programId.toBase58() == TOKEN_PROGRAM_ID.toBase58()
            const isTransfer = parsedInstruction.parsed['type'] == 'transfer'
            const isTokenTransfer = parsedInstruction.parsed['type'] == 'tokenTransfer'
            return isTokenProgram || isTransfer || isTokenTransfer
        } else {
            return false
        }
    })

    //Only if one of the transfers comes from my wallet
    const isSwap = _.find(onlyTransfers, x => {
        const parsedInstruction = (x as web3.ParsedInstruction)
        return parsedInstruction.parsed['info']['authority'] == userAddress
    })

    // console.log('---->', onlyTransfers)
    if (onlyTransfers.length == 2 && isSwap) {

        const send = _.find(onlyTransfers, x => {
            const parsedInstruction = (x as web3.ParsedInstruction)
            const sendFromWalletAddress = parsedInstruction.parsed['info']['source'] == userAddress
            const sendFromAccountAddress = parsedInstruction.parsed['info']['source'] == ata
            return sendFromWalletAddress || sendFromAccountAddress
        }) as web3.ParsedInstruction

        const receive = _.find(onlyTransfers, x => {
            const parsedInstruction = (x as web3.ParsedInstruction)
            const receiveOther = parsedInstruction.parsed['info']['authority'] != userAddress
            const receiveSelfAta = parsedInstruction.parsed['info']['destination'] == ata
            const receiveSelfAddress = parsedInstruction.parsed['info']['destination'] == userAddress
            return receiveOther || receiveSelfAta || receiveSelfAddress
        }) as web3.ParsedInstruction

        console.log('send', send)
        console.log('receive', receive)

        const sendAccountAddress = send.parsed['info']['source']
        const receiveAccountAddress = receive.parsed['info']['destination']

        let sendToken = null

        if (sendAccountAddress == wrappedSolAddress) {
            sendToken = _.find(tokenList, x => {
                return x.symbol.toLowerCase() == 'wsol'
            })
        } else {
            const sendTokenAccountInfo = await getAccount(
                connection,
                new PublicKey(sendAccountAddress)
            )
            sendToken = _.find(tokenList, x => {
                return x.address == sendTokenAccountInfo.mint.toBase58()
            })
        }

        let receiveToken = null
        if (receiveAccountAddress == wrappedSolAddress) {
            receiveToken = _.find(tokenList, x => {
                return x.symbol.toLowerCase() == 'wsol'
            })
        } else {
            const receiveTokenAccountInfo = await getAccount(
                connection,
                new PublicKey(receiveAccountAddress)
            )
            receiveToken = _.find(tokenList, x => {
                return x.address == receiveTokenAccountInfo.mint.toBase58()
            })
        }

        console.log(send,)

        return <ReadableSwap>{
            tx: transaction.transaction.signatures,
            time: transaction.blockTime,
            raw: { send, receive },
            type: 'SWAP',
            sendToken: send.parsed['info']['source'],
            infoSendToken: sendToken,
            amountSendToken: send.parsed['info']['amount'],
            amountWithDecimalsSendToken: send.parsed['info']['amount'] / Math.pow(10, sendToken.decimals),
            receiveToken: receive.parsed['info']['source'],
            infoReceiveToken: receiveToken,
            amountReceiveToken: receive.parsed['info']['amount'],
            amountWithDecimalsReceiveToken: receive.parsed['info']['amount'] / Math.pow(10, receiveToken.decimals),
        }
    }
    return null
}


export const getReadableTransaction = async (ata: string, userAddress: string, transaction: web3.ParsedTransactionWithMeta, tokenList: any[]): Promise<ReadableTransaction | null> => {
    const transfer = await getSolTransfer(userAddress, transaction, tokenList)
    if (transfer) {
        return transfer
    }

    const tokenTransfer = await getTokenTransfer(userAddress, transaction, tokenList)
    console.log('tokenTransfer', tokenTransfer)
    if (tokenTransfer) {
        return tokenTransfer
    }

    try {
        const wrappedSolAddress = await getWSolAddressForAddress(userAddress)
        const swap = await getSolWrappedSwap(ata, userAddress, transaction, tokenList, wrappedSolAddress)
        console.log('swap', swap)
        if (swap) {
            return swap
        }
    } catch (error) {
        //TOOD: Change this for something better than just silently fail
    }


    // console.log('transaction ===>', transaction.meta.innerInstructions)
    // console.log('===========================')

    return null
}
