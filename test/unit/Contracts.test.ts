import { expect } from 'chai'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import 'mocha/mocha'
import path, { join } from 'path'
import { compileSolidityContract } from '../../src/modules/ContractCompiler'
import { EthRPC } from '../../src/modules/EthRPC'
import { EthAccount } from '../../src/types/EthAccount'
import { CompiledEthContractObject } from '../../src/types/EthContract'

describe('Contracts unit tests', () => {

    let contract: CompiledEthContractObject,
        contractAddress: string,
        deployed = false

    let rpc : EthRPC

    const root = JSON.parse(
        readFileSync(
            join(process.cwd(), 'test', 'resources', 'root_wallet')
        ).toString()
    ) as EthAccount

    before('Startup', async function(){

        rpc = new EthRPC()

    })

    describe('Contract compilation', () => {

        it('Compile contract: should produce binary & metadata tree', function() {

            this.timeout(0)

            const compiled = compileSolidityContract(
                path.join(
                    process.cwd(), 'test', 'resources', 'test_contract.sol'
                )
            )
    
            expect(compiled.contracts).not.undefined
            expect(compiled.sources).not.undefined
    
            const single = compiled.contracts['test_contract.sol']['TestContract']
    
            expect(single).not.undefined
    
            console.log('Gas estimates:', single.evm.gasEstimates)
    
            contract = single

            const tmpdir = join(process.cwd(), 'tmp')

            if(!existsSync(tmpdir))
                mkdirSync(tmpdir)

            writeFileSync(
                join(tmpdir, 'test_contract.abi.json'),
                JSON.stringify(contract.abi, null, 2)
            )
            
        })

    })

    describe('Contract deployment', () => {

        before(async function(){

            if(!contract) 
                throw new Error('Previous test failed due to contract compilation errors')

        })

        it('Prepare smart contract transaction: should succeed', async function(){

            const { signed, gas } = await rpc.prepareSmartContractDeployTransaction(contract, root.privateKey, root.address)

            console.log('Estimated gas for repared deployment transaction:', gas)

            expect(signed.rawTransaction).not.undefined

        })

        it('Deploy smart contract: should succeed', async function(){

            this.timeout(0)

            const balance = await rpc.getBalance(root.address)

            expect(+balance).above(+contract.evm.gasEstimates.creation.totalCost)

            const receipt = await rpc.deployContract(contract, root.privateKey, root.address)

            expect(receipt.contractAddress).not.undefined

            console.log('Contract deployment receipt:', receipt)

            deployed = true
            contractAddress = receipt.contractAddress!


        })

    })

    describe('Contract calls', () => {

        let receiver : EthAccount

        const refillReceiverBalance = async(ethValue: string) => {

            return await rpc.sendETH(root.privateKey, receiver.address, ethValue)

        }

        before(async function () {

            if(!contract)
                throw new Error('Previous test failed due to contract compilation errors')

            if(!deployed || !contractAddress)
                throw new Error('Previous test failed due to contract deployment errors')

            receiver = await rpc.createAccount()
            
        })

        it('Get available contract methods: should list well known', () => {

            const c = new rpc.client.eth.Contract(contract.abi, contractAddress)

            console.log('Available methods:', Object.getOwnPropertyNames(c.methods))

        })

        it('Get total supply: should succeed & return initial value', async function(){

            const result = await rpc.getContractPropertyValue(contract, contractAddress, 'supply', root.address)

            expect(result).not.undefined

            expect(result).eq('1000000')

        })

        it('Mint from initial supply: should succeed', async function(){

            this.timeout(0)

            const { signed, gas } = await rpc.prepareContractCallTransaction(
                contract, contractAddress, 'mint',
                [receiver.address, 100_000],
                root.privateKey, root.address
            )

            expect(signed.rawTransaction).not.undefined
            expect(gas).above(0)

            const rcpt = await rpc.sendContractCallTransaction(signed)

            expect(rcpt.status).eq(true)

            console.log('Mint receipt:', rcpt)

        })

        it('Get total supply: should be reduced due to previous mint', async function(){

            const result = await rpc.getContractPropertyValue(contract, contractAddress, 'supply', root.address)

            expect(result).eq('900000')

        })

        it('Get minted recipient balance: should contain minted value', async function(){

            const result = await rpc.getContractPropertyValue(
                contract, contractAddress, 'getBalance', receiver.address, [receiver.address]
            )

            expect(result).eq('100000')

        })

        it('Send supplied value from minted recipient balance to another address: should succeed', async function(){

            this.timeout(0)

            const refillReceipt = await refillReceiverBalance('0.1')
            
            expect(refillReceipt).not.undefined
            expect(refillReceipt.status).eq(true)

            console.log('Refilled p2p sender balance with 0.1 eth')

            const p2pSender = receiver

            const p2pReceiver = await rpc.createAccount()

            const { signed, gas } = await rpc.prepareContractCallTransaction(
                contract, contractAddress, 
                'send', [p2pReceiver.address, 30_000],
                p2pSender.privateKey, p2pSender.address
            )

            expect(gas).above(0)
            console.log('p2p send transaction gas estimate:', gas)

            expect(signed.rawTransaction).not.undefined

            const rcpt = await rpc.sendContractCallTransaction(signed)

            expect(rcpt.status).eq(true)

            console.log('p2p send receipt:', rcpt)

            const p2psenderBalance = await rpc.getContractPropertyValue(
                contract, contractAddress, 'getBalance', p2pSender.address, [p2pSender.address]
            )

            expect(p2psenderBalance).eq('70000')

            const p2preceiverBalance = await rpc.getContractPropertyValue(
                contract, contractAddress, 'getBalance', p2pReceiver.address, [p2pReceiver.address]
            )

            expect(p2preceiverBalance).eq('30000')

        })

    })

})