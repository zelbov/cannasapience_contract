
export interface CompiledEthContractObject {

    abi: any[]
    evm: {
        bytecode: {
            object: any
        }
        gasEstimates: {
            creation: {
                codeDepositCost: string,
                executionCost: string,
                totalCost: string
            },
            external: {
                [key: string]: string
            }
        },
    }

}

export interface CompiledEthContract {

    [contractName: string]: CompiledEthContractObject
    
}

export interface SourceEthContract {

    id: number

}