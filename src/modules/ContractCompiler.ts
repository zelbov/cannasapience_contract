import fs, { existsSync, mkdirSync, writeFileSync } from 'fs'
import path, { join } from 'path'
import { CompiledEthContract, SourceEthContract } from '../types/EthContract';
import { config as env } from 'dotenv'

env()

let solc : any // cold module load

export const saveContractArtifacts = (contractName: string, data: OutputResult) => {

    const tmpdir = join(process.cwd(), 'tmp')

    if(!existsSync(tmpdir)) mkdirSync(tmpdir)

    const files = data.contracts

    const entrypoint = Object.keys(data.contracts).reverse()[0]

    const contract = files[entrypoint][contractName]

    const filename = entrypoint.replace('.sol', '')

    writeFileSync(join(tmpdir, filename+'.abi.json'), JSON.stringify(contract.abi, null, 2))
    writeFileSync(join(tmpdir, filename+'.bin'), '0x'+contract.evm.bytecode.object)
    writeFileSync(join(tmpdir, filename+'.ast.full.json'), JSON.stringify(data, null, 2))

    const metadata = JSON.parse(contract.metadata)

    const { sources, settings, language } = metadata;

    // Blockscout validator does not like these keys somewhat
    for(let name of Object.keys(sources)) delete sources[name].license;
    delete settings.compilationTarget;

    const stdJSONInput = {
        sources, settings, language
    }

    writeFileSync(join(tmpdir, filename+'.input-compiled.json'), JSON.stringify(stdJSONInput, null, 2))
    
}

const injectEnv = (source: string) => {

    let envId = source.match(/\_\_(.+?)\_\_/)

    while(envId && envId[0]) {

        const id = envId[0], cut = id.replace(/^\_\_|\_\_$/g, '')

        if(!process.env[cut]) throw new Error(`Env var "${cut}" used in source but not defined`)

        source = source.replace(id, process.env[cut] || '')

        envId = source.match(/\_\_(.+?)\_\_/)

    }

    return source;

}

interface OutputResult {
    errors: any[]
    contracts: { [key: string]: CompiledEthContract },
    sources: { [key: string]: SourceEthContract }
}

export const compileSolidityContract = (contractPath: string) => {

    if(!solc) solc = require('solc')

    let source = fs.readFileSync(contractPath, 'utf8')

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
                useLiteralContent: true,
            }
        },
    };

    const compiled = solc.compile(
        JSON.stringify(input),
        {
            import: (filePath: string) => {

                filePath = 
                    filePath.match(/^\@/) 
                        ? path.join(process.cwd(), 'node_modules', filePath)
                        : path.join(dirname, filePath)

                const contents = injectEnv(fs.readFileSync(filePath).toString())

                return { contents }

            }
        })

    const result = JSON.parse(compiled) as OutputResult;

    if(result.errors) {
        for(let error of result.errors) {
            if(error.severity != 'warning') throw new Error(error.formattedMessage)
            else console.warn(error.formattedMessage)
        }
    }

    const mainContractName = Object.keys(result.contracts[basename]).reverse()[0]

    saveContractArtifacts(mainContractName, result)

    return result as {
        contracts: { [key: string]: CompiledEthContract },
        sources: { [key: string]: SourceEthContract }
    };

}