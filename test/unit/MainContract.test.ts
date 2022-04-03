import { expect } from 'chai'
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
            contractNames = Object.keys(contracts),
            mainContractName = contractNames.reverse()[0]

        contract = contracts[mainContractName]

        const deployResult = await rpc.deployContract(contract, root.privateKey)

        contractAddress = deployResult.contractAddress!

        console.log(mainContractName, 'contract address:', contractAddress)

    })

    
})