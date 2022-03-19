import fs from 'fs'
import path from 'path'
import { CompiledEthContract, SourceEthContract } from '../types/EthContract';

const solc = require('solc')

export const compileSolidityContract = (contractPath: string) => {

    const source = fs.readFileSync(contractPath, 'utf8');
    const basename = path.basename(contractPath)
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
        },
    };

    const compiled = solc.compile(JSON.stringify(input))

    return JSON.parse(compiled) as {
        contracts: { [key: string]: CompiledEthContract },
        sources: { [key: string]: SourceEthContract }
    };

}