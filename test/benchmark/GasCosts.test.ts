import { expect } from 'chai'
import 'mocha/mocha'
import { join } from 'path'
import { compileSolidityContract } from '../../src/modules/ContractCompiler'
import { EthRPC } from '../../src/modules/EthRPC'
import { EthAccount } from '../../src/types/EthAccount'
import { CompiledEthContractObject } from '../../src/types/EthContract'

describe('Gas costs performance', () => {

    let contract : CompiledEthContractObject,
        contractAddress: string,
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

        const deployTx = await rpc.prepareSmartContractDeployTransaction(
            contract, root.privateKey
        )

        console.log('Deployment gas cost estimated:', deployTx.gas)

        expect(deployTx.gas).lte(5_000_000)

        const deployResult = await rpc.deployContract(contract, root.privateKey)

        contractAddress = deployResult.contractAddress!

    })

    describe('Gas costs', () => {

        it('Whitelisting', async function(){

            this.timeout(0);

            const listed = [], listedAmount = 5;

            for(let i = 0; i < listedAmount; i++) {

                const wallet = await rpc.createAccount()
                listed.push(wallet.privateKey)
                await rpc.sendETH(root.privateKey, wallet.address, '0.1');

            }

            let idx = 0;

            for(let pkey of listed) {

                idx++;

                const { signed, gas } = await rpc.prepareContractCallTransaction(
                    contract, 
                    contractAddress,
                    'applyForWhitelist',
                    [], pkey
                )

                const rcpt = await rpc.sendContractCallTransaction(signed)

                expect(rcpt.status).eq(true)
                console.log('Tx #', idx, ': gas used:', rcpt.gasUsed, 'of', gas, 'estimated')

            }

        })

        it('Token minting', async function(){

            this.timeout(0);

            const mintPrice = process.env.PRESALE_TOKEN_PRICE_ETH!.replace(' ether', '')

            console.log('Mint price:', mintPrice, 'ETH')

            const mintPriceValue = rpc.client.utils.toWei(mintPrice, 'ether')

            const tokensPerTx = 3; //TODO: env

            let idx = 0;

            let tokensToMint = 3, maxMinted = +process.env.MAX_PRESALE_TOKENS_MINT!

            for(let i = 0; i < maxMinted; i += tokensToMint) {

                idx++;

                if(i > maxMinted) tokensToMint -= i - maxMinted

                const { signed, gas } = await rpc.prepareContractCallTransaction(
                    contract,
                    contractAddress,
                    'mintTokens',
                    [tokensToMint],
                    root.privateKey,
                    (Math.ceil(+mintPriceValue * tokensPerTx)).toString()
                );
                    
                const rcpt = await rpc.sendContractCallTransaction(signed)

                expect(rcpt.status).eq(true);
                console.log('Tx #', idx, ': gas used:', rcpt.gasUsed, 'of', gas, 'estimated');

            }

        })
        it('Airdropping')

        it('Pre-sale & approvals')
        it('Public sale & approvals')

    })

})