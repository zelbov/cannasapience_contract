import fs, { existsSync, mkdirSync, writeFileSync } from 'fs'
import path, { join } from 'path'
import { CompiledEthContract, SourceEthContract } from '../types/EthContract';
import { config as env } from 'dotenv'

env()

let solc : any // cold module load

export const saveContractArtifacts = (contractName: string, data: {
    contracts: { [key: string]: CompiledEthContract },
    sources: { [key: string]: SourceEthContract }
}) => {

    const tmpdir = join(process.cwd(), 'tmp')

    if(!existsSync(tmpdir)) mkdirSync(tmpdir)

    const files = data.contracts

    const entrypoint = Object.keys(data.contracts).reverse()[0]

    console.log('Contracts:', Object.keys(files[entrypoint]))

    const contract = files[entrypoint][contractName]

    const filename = entrypoint.replace('.sol', '')

    writeFileSync(join(tmpdir, filename+'.abi.json'), JSON.stringify(contract.abi, null, 2))
    writeFileSync(join(tmpdir, filename+'.bin'), '0x'+contract.evm.bytecode.object)
    writeFileSync(
        join(tmpdir, filename+'.metadata.json'), 
        JSON.stringify(JSON.parse(contract.metadata), null, 2)
    )
    writeFileSync(join(tmpdir, filename+'.ast.full.json'), JSON.stringify(data, null, 2))
    
}

const injectEnv = (source: string) => {

    let envId = source.match(/\_\_(.+)\_\_/)

    while(envId && envId[0]) {

        const id = envId[0], cut = id.replace(/^\_\_|\_\_$/g, '')

        source = source.replace(id, process.env[cut] || '')

        envId = source.match(/\_\_(.+)\_\_/)

    }

    return source;

}

export const compileSolidityContract = (contractPath: string) => {

    if(!solc) solc = require('solc')

    let source = fs.readFileSync(contractPath, 'utf8')

    source = source // a hack for relative paths support
        .replace(/\.\.\//g, '&&/') // replace double dot rel path
        .replace(/\.\//g, '&/') // replace single dot rel path

    source = injectEnv(source)
    
    const basename = path.basename(contractPath)
    const dirname = path.dirname(contractPath)
    const input = {
        language: 'Solidity',
        sources: {
            [basename]: {
                content: source,
            },
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': [
                        "evm.bytecode",
                        "evm.deployedBytecode",
                        "devdoc",
                        "userdoc",
                        "metadata",
                        "abi"
                    ],
                },
            },
            optimizer: {
                enabled: true
            },
            metadata: {
                // Use only literal content and not URLs (false by default)
                useLiteralContent: true,
            },
            remappings: [
                `@openzeppelin=${process.cwd()}/node_modules/@openzeppelin`,
                `&&/=${path.resolve(dirname, '..')}/`,
                `&/=${dirname}/`,
            ],
        },
    };

    const compiled = solc.compile(
        JSON.stringify(input),
        {
            import: (filePath: string) => {

                return {
                    contents: fs.readFileSync(filePath).toString()
                }

            }
        })

    const result = JSON.parse(compiled) as {
        errors: any[]
        contracts: { [key: string]: CompiledEthContract },
        sources: { [key: string]: SourceEthContract }
    };

    if(result.errors) throw new Error(result.errors[0].formattedMessage)

    const mainContractName = Object.keys(result.contracts[basename]).reverse()[0]

    saveContractArtifacts(mainContractName, result)

    return result as {
        contracts: { [key: string]: CompiledEthContract },
        sources: { [key: string]: SourceEthContract }
    };

}