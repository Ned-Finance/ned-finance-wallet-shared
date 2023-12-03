export const round2Decimals = (num: number) => {
    return Math.round((num + Number.EPSILON) * 100) / 100
}

export const roundToNDecimals = (num: number, decimals: number) => {
    return Math.round((num + Number.EPSILON) * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

