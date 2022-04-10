import { INestApplication } from '@nestjs/common'
import { expect } from 'chai'
import 'mocha/mocha'
import { join } from 'path/posix'
import { startService } from '../../src/api'
import { compileSolidityContract } from '../../src/modules/ContractCompiler'
import { EthRPC } from '../../src/modules/EthRPC'
import { EthAccount } from '../../src/types/EthAccount'
import { CompiledEthContractObject } from '../../src/types/EthContract'

describe('MainContract unit tests', () => {

    let contract : CompiledEthContractObject,
        contractAddress : string,
        rpc: EthRPC,
        root: EthAccount

    before('Deploy main contract', async function(){

        this.timeout(0)

        rpc = new EthRPC()
        root = rpc.loadAccount(process.env.ETH_WALLET_PKEY!)

        const compiled = compileSolidityContract(
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
        

    })

    describe('Minting tokens', () => {

        it('Check token URI by tokenId: should match valid URI')

        //...
        it('Mint new token: should succeed')

    })

    describe('Whitelisting & pre-sale performance', () => {

        //...

    })

    describe('Public sale performance', () => {

        //...

    })

    describe('Shares & royalties performance', () => {

        //...

    })

    describe('OpenSea integrations performance', () => {

        describe('Tokens publishing & distribution', () => {

            let app: INestApplication

            after('Shutdown', async function(){

                if(app) await app.close()
                
            })

            before('Startup', async function(){

                app = await startService()

            })

            it('Publish asset & its metadata: should succeed')
            it('Get metadata of asset: should succeed & pass validation')

        })

        describe('Proxy registry & access performance', () => {

            //...

        })

    })

    
})