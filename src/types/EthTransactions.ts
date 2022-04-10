import BN from 'bn.js'

type chain =
    | 'mainnet'
    | 'goerli'
    | 'kovan'
    | 'rinkeby'
    | 'ropsten';

type hardfork =
    | 'chainstart'
    | 'homestead'
    | 'dao'
    | 'tangerineWhistle'
    | 'spuriousDragon'
    | 'byzantium'
    | 'constantinople'
    | 'petersburg'
    | 'istanbul';

interface Common {
    customChain: CustomChainParams;
    baseChain?: chain;
    hardfork?: hardfork;
}

interface CustomChainParams {
    name?: string;
    networkId: number;
    chainId: number;
}

export interface TransactionConfig {
    from?: string | number;
    to?: string;
    value?: number | string | BN;
    gas?: number | string;
    gasPrice?: number | string | BN;
    maxPriorityFeePerGas?: number | string | BN;
    maxFeePerGas?: number | string | BN;
    data?: string;
    nonce?: number;
    chainId?: number;
    common?: Common;
    chain?: string;
    hardfork?: string;
}

