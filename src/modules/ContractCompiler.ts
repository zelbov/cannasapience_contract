import fs from 'fs'
import path from 'path'
import { CompiledEthContract, SourceEthContract } from '../types/EthContract';

let solc : any // cold module load

export const compileSolidityContract = (contractPath: string) => {

    if(!solc) solc = require('solc')

    let source = fs.readFileSync(contractPath, 'utf8')

    source = source // a hack for relative paths support
        .replace(/\.\.\//g, '&&/') // replace double dot rel path
        .replace(/\.\//g, '&/') // replace single dot rel path
    
    const basename = path.basename(contractPath)
    const dirname = path.dirname(contractPath)
    console.log({ dirname })
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
                    '*': ['*'],
                },
            },
            optimizer: {
                enabled: true
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

                console.log('import path:', filePath)
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

    return result as {
        contracts: { [key: string]: CompiledEthContract },
        sources: { [key: string]: SourceEthContract }
    };

}