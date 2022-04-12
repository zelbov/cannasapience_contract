import Web3 from 'web3'
import { SignedTransaction } from 'web3-core/types'
import { DEFAULT_ETH_TX_GAS } from '../constants/EthMainnet';
import { EthAccount } from '../types/EthAccount';
import { CompiledEthContractObject } from '../types/EthContract';
import { TransactionConfig } from '../types/EthTransactions';
import { QueueLock } from './SyncOps';

type ClientOptions = {

    proto?: 'http' | 'https',
    host?: string,
    port?: number

}

export class EthRPC {

    private _connection : Web3; 

    constructor(options: ClientOptions = {}){

        this._connection = new Web3(`${
            options.proto || RPC_PROTO
        }://${
            options.host || RPC_HOST
        }${
            RPC_PORT != '' ? `:${options.port || RPC_PORT}` : ''
        }`)

        QueueLock.initLocksContainer('NonceIncrement');

    }

    public get client() { return this._connection }

    private _nonces: {[address: string]: number} = {}

    private async getNonce(address: string) {

        const queue = QueueLock.getLock('NonceIncrement', '0');

        await queue.lock()

        if(!this._nonces[address]){
            this._nonces[address] = await this.client.eth.getTransactionCount(address)
        }

        queue.release()

        const nonce = this._nonces[address]++

        return nonce;

    }

    public async sendETH(senderPrivateKey: string, receiverAddress: string, ethValue: string) {

        const account = this.client.eth.accounts.privateKeyToAccount(senderPrivateKey),
            nonce = await this.getNonce(account.address),
            gas = DEFAULT_ETH_TX_GAS,
            value = this.client.utils.toWei(ethValue, 'ether'),
            to = receiverAddress,
            tx = { to, value, gas, nonce }

        const signedTx = await this.client.eth.accounts.signTransaction(tx, senderPrivateKey);

        if(!signedTx.rawTransaction)
            throw new Error('Undefined raw transaction produced from '+JSON.stringify(tx))

        const rcpt = await this.client.eth.sendSignedTransaction(signedTx.rawTransaction!)

        return rcpt;

    }

    /**
     * Readonly contract property accessors & methods call function
     * Used for calls that do not require an external transaction to push into blockchain
     * 
     * @param contract 
     * @param contractAddress 
     * @param propertyName 
     * @param callerAddress 
     * @param getterParams 
     * @returns 
     */
    public async getContractPropertyValue<ValueType = any>(
        contract: CompiledEthContractObject,
        contractAddress: string,
        propertyName: string,
        callerAddress: string,
        getterParams: any[] = []
    ) {

        const c = new this._connection.eth.Contract(contract.abi, contractAddress),
            result : ValueType = await c.methods[propertyName](...getterParams).call({ from: callerAddress })

        return result

    }

    /**
     * 
     * Prepare a transaction for a call of contract function that performs any mutability (requires gas fee)
     * 
     * For readonly (properties or accessors with `view` modifier), use `getContractPropertyValue` instead
     * 
     * @param contract 
     * @param contractAddress 
     * @param method 
     * @param args 
     * @param accountPrivateKey 
     * @returns 
     */
    public async prepareContractCallTransaction(
        contract: CompiledEthContractObject,
        contractAddress: string,
        method: string,
        args: any[],
        accountPrivateKey: string,
        value: string = '0'
    ) {

        const c = new this._connection.eth.Contract(contract.abi, contractAddress),
            call = c.methods[method](...args),
            encoded = call.encodeABI(),
            { address } = this.loadAccount(accountPrivateKey),
            nonce = await this.getNonce(address),
            estimateConfig = { from: address, to: contractAddress, data: encoded, value, nonce }

        Object.assign(estimateConfig, { value })

        const gas : number = await call.estimateGas(estimateConfig),
            
            tx : TransactionConfig = {
                from: address,
                to: contractAddress,
                data: encoded, value,
                gas, nonce
            }

        Object.assign(tx, { value })
            
        const signed = await this._connection.eth.accounts.signTransaction(tx, accountPrivateKey)

        if(!signed.rawTransaction)
            throw new Error('Could not call smart contract: signed transaction raw data is missing')

        return { tx, signed, gas } as { tx: typeof tx, signed: SignedTransaction & { rawTransaction: string }, gas: number };

    }

    public async sendContractCallTransaction(
        signed: SignedTransaction
    ) {

        const callReceipt = await this._connection.eth.sendSignedTransaction(signed.rawTransaction!);

        return callReceipt;

    }

    public async prepareSmartContractDeployTransaction(
        contract: CompiledEthContractObject,
        accountPrivateKey: string,
        args: any[] = []
    ) {

        if(!contract.evm.bytecode.object)
            throw new Error('Contract bytecode is missing')

        if(!contract.abi)
            throw new Error('Contract ABI data is missing')

        const c = new this._connection.eth.Contract(contract.abi),
            cTx = c.deploy({ data: contract.evm.bytecode.object, arguments: args }),
            { address } = this.loadAccount(accountPrivateKey),
            nonce = await this.getNonce(address),
            gas = await cTx.estimateGas({ from: address }),
            signed = await this._connection.eth.accounts.signTransaction(
                {
                   from: address,
                   data: cTx.encodeABI(),
                   gas, nonce
                },
                accountPrivateKey
            );

        if(!signed.rawTransaction)
            throw new Error('Could not deploy smart contract: signed transaction raw data is missing')

        return { signed, gas } as { signed: SignedTransaction & { rawTransaction: string }, gas: number };

    }

    public async deployContract(

        contract: CompiledEthContractObject,
        accountPrivateKey: string,
        params: string[] = []

    ) {
       
        const { signed } = await this.prepareSmartContractDeployTransaction(contract, accountPrivateKey, params)

        const createReceipt = await this._connection.eth.sendSignedTransaction(signed.rawTransaction!);

        return createReceipt;

    }

    public loadAccount(privateKey: string) {
        return this._connection.eth.accounts.privateKeyToAccount(privateKey)
    }

    /**
     * Create new account with wallet address, private key and transactions/passwords signing methods
     */
     public async createAccount() : Promise<EthAccount> {

        //TODO: optionally password-protect

        let account = this._connection.eth.accounts.create(),
            created_at_block = await this.getCurrentBlock(),
            full = Object.assign(
                account, { created_at_block }
            );

        return full;

    }

    /**
     * Get wallet balance
     * @param address wallet address
     * @returns amount of Wei currently available on account balance
     */
     public async getBalance(address: string) {

        return await this._connection.eth.getBalance(address);

    }

    /**
     * Get current block number identified in local blockchain.
     * Returns known highestBlock number for node that is under sync process 
     */
     public async getCurrentBlock() {

        try {
            let syncing = (
                    await this._connection.eth.isSyncing()
                ) as any; // Incorrect type: uses CapitalCase but real values are camelCase

            if(syncing) {

                return (
                    syncing as { highestBlock: number } //re-transform to correct type
                ).highestBlock; 
                //get highest block since no inbound/outbound transaction can be made 
                //before a current known block in network

            }
        } catch(ex) { throw new Error((ex as Error).toString()) }

        try {

            return await this._connection.eth.getBlockNumber();

        } catch(ex) { throw new Error((ex as Error).toString()) }

    }

}

const RPC_HOST = process.env.WALLET_API_HOST

const RPC_PORT = process.env.WALLET_API_PORT

const RPC_PROTO = process.env.WALLET_API_PROTO