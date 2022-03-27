import { expect } from 'chai'
import { readFileSync } from 'fs'
import 'mocha/mocha'
import { join } from 'path'
import { compileSolidityContract } from '../../src/modules/ContractCompiler'
import { EthRPC } from '../../src/modules/EthRPC'
import { EthAccount } from '../../src/types/EthAccount'
import { CompiledEthContractObject } from '../../src/types/EthContract'

describe('ERC20 dummy contract unit testing', () => {

    let contract: CompiledEthContractObject,
        contractAddress: string

    let rpc : EthRPC

    const root = JSON.parse(
        readFileSync(
            join(process.cwd(), 'test', 'resources', 'root_wallet')
        ).toString()
    ) as EthAccount

    before(async function(){

        this.timeout(0)

        const compiled = await compileSolidityContract(
            join(
                process.cwd(), 'test', 'resources', 'test_erc20.sol'
            )
        )

        contract = compiled.contracts['test_erc20.sol']['TestERC20']
        rpc = new EthRPC()

        const rcpt = await rpc.deployContract(contract, root.privateKey, root.address)

        contractAddress = rcpt.contractAddress!

    })

    it('Get deployed ERC20 name & symbol contract values; should match defined in code', async function(){

        const name = await rpc.getContractPropertyValue(contract, contractAddress, 'name', root.address)

        expect(name).eq('Test')

        const symbol = await rpc.getContractPropertyValue(contract, contractAddress, 'symbol', root.address)

        expect(symbol).eq('TST')

    })

    it('Make transferFrom call: should succeed & update balance values', async function(){

        this.timeout(0)

        const recipient = (await rpc.createAccount()).address

        console.log('Recipient:', recipient)

        const tx = await rpc.prepareContractCallTransaction(
            contract, contractAddress,
            'transfer', [recipient, '100000'],
            root.privateKey, root.address
        )

        const result = await rpc.sendContractCallTransaction(tx.signed)

        console.log('Transfer result:', JSON.stringify(result, null, 2))

        expect(result.status).eq(true)

    })

    it('Get owner account balance: should reduce by previously sent value', async function(){

        const result = await rpc.getContractPropertyValue(contract, contractAddress, 'balanceOf', root.address, [root.address])

        expect(result).eq('900000')

    })

})