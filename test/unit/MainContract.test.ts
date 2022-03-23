import { expect } from 'chai'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import 'mocha/mocha'
import { join } from 'path/posix'
import { compileSolidityContract } from '../../src/modules/ContractCompiler'
import { EthRPC } from '../../src/modules/EthRPC'
import { EthAccount } from '../../src/types/EthAccount'
import { CompiledEthContractObject } from '../../src/types/EthContract'

describe('MainContract unit tests', () => {

    let contract : CompiledEthContractObject,
        contractAddress : string,
        rpc: EthRPC,
        root: EthAccount

    before('Deploy main entry point', async function(){

        this.timeout(0)

        rpc = new EthRPC()
        root = rpc.loadAccount(process.env.ETH_WALLET_PKEY!)

        const compiled = await compileSolidityContract(
                join(
                    process.cwd(), 'src', 'contracts', 'main.sol'
                )
            ),
            contracts = compiled.contracts['main.sol'],
            contractNames = Object.keys(contracts)

        console.log({ contractNames })

        contract = contracts[contractNames.reverse()[0]]

        const tmpdir = join(process.cwd(), 'tmp')

        if(!existsSync(tmpdir)) mkdirSync(tmpdir)

        writeFileSync(join(tmpdir, 'main_test.json'), JSON.stringify(contract.abi, null, 2))
        writeFileSync(join(tmpdir, 'main_test.bin'), '0x'+contract.evm.bytecode.object)

        const deployResult = await rpc.deployContract(contract, root.privateKey, root.address)

        contractAddress = deployResult.contractAddress!

        console.log('Root contract address:', contractAddress)

    })

    describe('Dynamic minting', () => {

        let mintedContractAddress: string 

        it('Mint new contract from parent dynamically: should succeed & produce another contract with different addr', async function(){

            this.timeout(0)
    
            const call = await rpc.prepareContractCallTransaction(
                    contract, contractAddress, 'mint', [], root.privateKey, root.address
                ),
                tx = await rpc.sendContractCallTransaction(call.signed)
    
            const newAddress = tx.logs[0].address

            expect(newAddress).not.null.and.not.undefined
            expect(newAddress).not.eq(contractAddress)

            console.log('Dynamically minted contract address:', newAddress)

            mintedContractAddress = newAddress!
    
        })

        it('Get minted contract name: should succeed & match parent template contract name', async function(){

            const name = await rpc.getContractPropertyValue(contract, mintedContractAddress, 'name', root.address)

            expect(name).eq('Cannasapience')

        })

    })
    
})