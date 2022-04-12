require('dotenv').config()

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { compileSolidityContract } from "./modules/ContractCompiler";
import { EthRPC } from "./modules/EthRPC"

const WALLET_PKEY = process.env.ETH_WALLET_PKEY!

if(!WALLET_PKEY) throw new Error('ETH_WALLET_PKEY env var is not defined')

const rpc = new EthRPC()

;(async() => {

    const account = rpc.loadAccount(WALLET_PKEY);

    console.log('Compiling a contract...')

    const compiled = compileSolidityContract(
            join(process.cwd(), 'src', 'contracts', 'main.sol')
        ).contracts['main.sol'],
        contractName = Object.keys(compiled).reverse()[0], // consider last contract is an entrypoint
        contract = compiled[contractName]

    console.log('Contract name:', contractName)

    const tmpdir = join(process.cwd(), 'tmp')

    if(!existsSync(tmpdir)) mkdirSync(tmpdir)

    writeFileSync(join(tmpdir, 'main.json'), JSON.stringify(contract.abi, null, 2))
    writeFileSync(join(tmpdir, 'main.bin'), '0x'+contract.evm.bytecode.object)

    console.log('Deploying a contract...')

    let params = process.argv, 
        cmdIdx = 0

    params.map((param, idx) => { if(param.match(/index.(j|t)s$/)) cmdIdx = idx + 1 })

    params = params.splice(cmdIdx).filter($ => $ != '--')

    console.log('Constructor parameters:', params)

    const deployTx = await rpc.prepareSmartContractDeployTransaction(contract, account.privateKey, params)

    const receipt = await rpc.client.eth.sendSignedTransaction(deployTx.signed.rawTransaction)

    console.log('Success! Contract deployment receipt:', receipt)

    process.exit(0)

})();