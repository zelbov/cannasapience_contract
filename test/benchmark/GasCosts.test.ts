import { expect } from 'chai'
import 'mocha/mocha'
import { join } from 'path'
import { setTimeout } from 'timers/promises'
import { compileSolidityContract } from '../../src/modules/ContractCompiler'
import { EthRPC } from '../../src/modules/EthRPC'
import { EthAccount } from '../../src/types/EthAccount'
import { CompiledEthContractObject } from '../../src/types/EthContract'

describe('Gas costs performance', () => {

    let contract : CompiledEthContractObject,
        contractAddress: string,
        rpc: EthRPC,
        root: EthAccount

    let reports : (string | number | Object)[] = [];

    const report = (...data: (string | number | Object)[]) => reports.push(...data, '\n')

    const showReports = () => { if(reports.length) console.log('** Reports: **\n',...reports, '\n'); reports = [] }

    afterEach(() => {

        showReports()

    })

    before('Compile main contract', async function(){

        // override presale duration to prevent long waits
        process.env.PRESALE_DURATION_SECONDS = '120'

        // prevent huge spendingds during test on public test network (e.g. Rinkeby)
        process.env.PRESALE_TOKEN_PRICE_ETH = '0.0002 ether'
        process.env.SALE_TOKEN_PRICE_ETH = '0.00025 ether'

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

    })

    describe('Gas costs', () => {

        const listed : string[] = [], listedAmount = +process.env.MAX_PRESALE_USER_MINTED_TOKENS_PER_TX! + 2;

        before(async function(){

            this.timeout(0)

            await Promise.all(new Array(listedAmount).fill(0).map(async () => {

                const wallet = await rpc.createAccount()
                listed.push(wallet.privateKey)
                await rpc.sendETH(root.privateKey, wallet.address, '0.01');

            }))

        })

        let deployed = false

        let presaleEndTS : number = 0;

        it('Deployment', async function(){

            this.timeout(0)

            const deployTx = await rpc.prepareSmartContractDeployTransaction(contract, root.privateKey)

            const deployResult = await rpc.client.eth.sendSignedTransaction(deployTx.signed.rawTransaction)

            contractAddress = deployResult.contractAddress!

            deployed = true

            report('Deployment gas used:', deployResult.gasUsed)

            expect(deployResult.gasUsed).lte(5_000_000)

            // record presale end timestamp
            presaleEndTS = await rpc.getContractPropertyValue(
                contract, contractAddress, 'publicSaleStartTime', root.address
            )

        })

        it('Whitelisting', async function(){

            if(!deployed) return this.skip()

            this.timeout(0);

            let idx = 0;

            await Promise.all(listed.map(async (pkey) => {

                idx++;

                const { signed, gas } = await rpc.prepareContractCallTransaction(
                    contract, 
                    contractAddress,
                    'applyForWhitelist',
                    [], pkey
                )

                const rcpt = await rpc.sendContractCallTransaction(signed)

                expect(rcpt.status).eq(true)
                report('Tx #', idx, ': gas used:', rcpt.gasUsed, 'of', gas, 'estimated')

            }))

        })

        for(let amount = 1; amount <= +process.env.MAX_PRESALE_USER_MINTED_TOKENS_PER_TX!; amount++)
        it('Token minting: '+amount+' tokens per tx', async function(){

            if(!deployed) return this.skip()

            this.timeout(0);

            const mintPrice = process.env.PRESALE_TOKEN_PRICE_ETH!.replace(' ether', '')

            report('Mint price:', mintPrice, 'ETH')

            const mintPriceValue = rpc.client.utils.toWei(mintPrice, 'ether')

            const tokensPerTx = amount;

            let idx = 0;

            let tokensToMint = amount, maxMinted = +process.env.MAX_PRESALE_TOKENS_MINT!

            const initiatorPkey = listed[amount]

            const mintWorks: (() => Promise<any>)[] = []

            for(let i = 0; i < maxMinted && idx < 3; i += tokensToMint) {

                const txIdx = idx++;

                mintWorks.push(async() => {

                    if(idx * tokensToMint > maxMinted) tokensToMint -= idx * tokensToMint - maxMinted

                    const { signed, gas } = await rpc.prepareContractCallTransaction(
                        contract,
                        contractAddress,
                        'mintTokens',
                        [tokensToMint],
                        initiatorPkey,
                        (Math.ceil(+mintPriceValue * tokensPerTx)).toString()
                    );
                        
                    const rcpt = await rpc.sendContractCallTransaction(signed)

                    expect(rcpt.status).eq(true);
                    report(
                        'Tx #',txIdx,': gas used:',rcpt.gasUsed,'of',gas,'estimated.', 
                        'Minted',tokensToMint,'tokens'
                    );

                })

            }

            await Promise.all(mintWorks.map(work => work()))

        })

        it('Airdropping', async function(){

            if(!deployed) return this.skip()

            this.timeout(0)

            const tokensToAirdrop = 5 < +process.env.RESERVE_FOR_AIRDROPS! ? 5 : +process.env.RESERVE_FOR_AIRDROPS!

            let idx = 0;

            await Promise.all(new Array(tokensToAirdrop).fill(0).map(async() => {

                idx++;

                // airdrop to owner for further marketplace trading manual tests
                const { address } = root

                const { signed, gas } = await rpc.prepareContractCallTransaction(
                    contract,
                    contractAddress,
                    'airdrop',
                    [address, idx],
                    root.privateKey
                )

                const rcpt = await rpc.sendContractCallTransaction(signed)

                expect(rcpt.status).eq(true)

                report('Tx #', idx, ': gas used:', rcpt.gasUsed, 'of', gas, 'estimated');

            }))
            
        })

        describe('Token minting at public sale', () => {

            const listed : string[] = [], listedAmount = +process.env.MAX_PUBSALE_USER_MINTED_TOKENS_PER_TX! + 2;

            before(async function(){

                if(!deployed) return this.skip()
            
                this.timeout(0)

                // wait for presale period ends
                // TODO: cover period > 0 blocks sealing case

                const waitTime = (presaleEndTS - Math.floor(new Date().getTime() / 1000)) * 1000

                console.log('Waiting for', Math.round(waitTime / 1000), 'seconds for public sale to start...')

                await setTimeout(waitTime)

                // refill other users balance, and so, seal new block for block.timestamp update

                await Promise.all(new Array(listedAmount).fill(0).map(async () => {

                    const wallet = await rpc.createAccount()
                    listed.push(wallet.privateKey)
                    await rpc.sendETH(root.privateKey, wallet.address, '0.01');
        
                }))

                // check whether it is a public sale already

                const isPublicSale = await rpc.getContractPropertyValue(
                    contract, contractAddress, 'isPublicSale', root.address
                )

                expect(isPublicSale).eq(true)

            })

            for(let amount = 1; amount <= +process.env.MAX_PUBSALE_USER_MINTED_TOKENS_PER_TX!; amount++)
            it('Token minting at public sale: '+amount+' tokens per tx', async function(){

                if(!deployed) return this.skip()

                this.timeout(0);

                const mintPrice = process.env.SALE_TOKEN_PRICE_ETH!.replace(' ether', '')

                report('Mint price:', mintPrice, 'ETH')

                const mintPriceValue = rpc.client.utils.toWei(mintPrice, 'ether')

                const tokensPerTx = amount;

                let idx = 0;

                let tokensToMint = amount, maxMinted = +process.env.MAX_PUBLIC_SALE_TOKENS_MINT!

                const initiatorPkey = listed[amount]

                const mintWorks: (() => Promise<any>)[] = []

                for(let i = 0; i < maxMinted && idx < 3; i += tokensToMint) {

                    const txIdx = idx++;

                    mintWorks.push(async() => {

                        if(idx * tokensToMint > maxMinted) tokensToMint -= idx * tokensToMint - maxMinted

                        const { signed, gas } = await rpc.prepareContractCallTransaction(
                            contract,
                            contractAddress,
                            'mintTokens',
                            [tokensToMint],
                            initiatorPkey,
                            (Math.ceil(+mintPriceValue * tokensPerTx)).toString()
                        );
                            
                        const rcpt = await rpc.sendContractCallTransaction(signed)

                        expect(rcpt.status).eq(true);
                        report(
                            'Tx #',txIdx,': gas used:',rcpt.gasUsed,'of',gas,'estimated.', 
                            'Minted',tokensToMint,'tokens'
                        );

                    })

                }

                await Promise.all(mintWorks.map(work => work()))

            })

        })

        describe('Withdrawal', () => {

            it('Withdraw', async function(){

                if(!deployed) return this.skip()
                
                this.timeout(0)
    
                const { signed, gas } = await rpc.prepareContractCallTransaction(
                    contract, contractAddress, 'withdrawAll', [], root.privateKey
                )
    
                const rcpt = await rpc.sendContractCallTransaction(signed)
    
                expect(rcpt.status).eq(true)
    
                report('Tx WITHDRAW: gas used:', rcpt.gasUsed, 'of', gas, 'estimated');
    
            })

        })

    })

})