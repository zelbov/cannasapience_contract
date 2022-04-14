import 'mocha/mocha'

import { INestApplication } from '@nestjs/common'

import chai, { expect } from 'chai'
import http from 'chai-http'
chai.use(http)

import { join } from 'path/posix'
import { startService } from '../../src/api'
import { compileSolidityContract } from '../../src/modules/ContractCompiler'
import { EthRPC } from '../../src/modules/EthRPC'
import { EthAccount } from '../../src/types/EthAccount'
import { CompiledEthContractObject } from '../../src/types/EthContract'
import { IAssetMetadata } from '../../src/api/types/AssetMetadata'
import { setTimeout } from 'timers/promises'

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

        const deployTx = await rpc.prepareSmartContractDeployTransaction(contract, root.privateKey)

        const deployResult = await rpc.client.eth.sendSignedTransaction(deployTx.signed.rawTransaction)

        contractAddress = deployResult.contractAddress!
        

    })

    describe('Constants', () => {

        it('Constant values & visibility: should be visible & match configured values', async function(){

            const MAX_PRESALE_TOKENS_MINT = await rpc.getContractPropertyValue(
                contract, contractAddress, 'MAX_PRESALE_TOKENS_MINT', root.address
            )
    
            expect(MAX_PRESALE_TOKENS_MINT.toString()).eq(process.env.MAX_PRESALE_TOKENS_MINT);
    
            const MAX_PUBLIC_SALE_TOKENS_MINT = await rpc.getContractPropertyValue(
                contract, contractAddress, 'MAX_PUBLIC_SALE_TOKENS_MINT', root.address
            )
    
            expect(MAX_PUBLIC_SALE_TOKENS_MINT.toString()).eq(process.env.MAX_PUBLIC_SALE_TOKENS_MINT);
    
            const MAX_TOKENS = await rpc.getContractPropertyValue(
                contract, contractAddress, 'MAX_TOKENS', root.address
            )
    
            expect(MAX_TOKENS.toString()).eq(process.env.MAX_TOKENS);
    
            const MAX_PRESALE_USER_MINTED_TOKENS_PER_TX = await rpc.getContractPropertyValue(
                contract, contractAddress, 'MAX_PRESALE_USER_MINTED_TOKENS_PER_TX', root.address
            )
    
            expect(MAX_PRESALE_USER_MINTED_TOKENS_PER_TX.toString()).eq(process.env.MAX_PRESALE_USER_MINTED_TOKENS_PER_TX);
    
            const MAX_PUBSALE_USER_MINTED_TOKENS_PER_TX = await rpc.getContractPropertyValue(
                contract, contractAddress, 'MAX_PUBSALE_USER_MINTED_TOKENS_PER_TX', root.address
            )
    
            expect(MAX_PUBSALE_USER_MINTED_TOKENS_PER_TX.toString()).eq(process.env.MAX_PUBSALE_USER_MINTED_TOKENS_PER_TX);
    
            const PRESALE_TOKEN_VALUE = await rpc.getContractPropertyValue(
                contract, contractAddress, 'PRESALE_TOKEN_VALUE', root.address
            )
    
            const [pricePresale, unitPresale] = process.env.PRESALE_TOKEN_PRICE_ETH!.split(/\s+/g) as [price: string, unit: 'ether'];
    
            expect(PRESALE_TOKEN_VALUE.toString()).eq(
                rpc.client.utils.toWei(pricePresale, unitPresale)
            );
    
            const PUBLIC_SALE_TOKEN_VALUE = await rpc.getContractPropertyValue(
                contract, contractAddress, 'PUBLIC_SALE_TOKEN_VALUE', root.address
            )
    
            const [pricePubsale, unitPubsale] = process.env.SALE_TOKEN_PRICE_ETH!.split(/\s+/g) as [price: string, unit: 'ether'];
    
            expect(PUBLIC_SALE_TOKEN_VALUE.toString()).eq(
                rpc.client.utils.toWei(pricePubsale, unitPubsale)
            );
    
            const RESERVE_FOR_AIRDROPS = await rpc.getContractPropertyValue(
                contract, contractAddress, 'RESERVE_FOR_AIRDROPS', root.address
            )
    
            expect(RESERVE_FOR_AIRDROPS.toString()).eq(process.env.RESERVE_FOR_AIRDROPS);
    
            const RESERVE_FOR_WHITELISTED = await rpc.getContractPropertyValue(
                contract, contractAddress, 'RESERVE_FOR_WHITELISTED', root.address
            )
    
            expect(RESERVE_FOR_WHITELISTED.toString()).eq(process.env.RESERVE_FOR_PRESALE);
            
        });

        it('Token identification: should match configured values', async function(){

            const name = await rpc.getContractPropertyValue(contract, contractAddress, 'name', root.address)

            expect(name).eq(process.env.TOKEN_NAME).and.not.undefined


            const symbol = await rpc.getContractPropertyValue(contract, contractAddress, 'symbol', root.address)

            expect(symbol).eq(process.env.TOKEN_SYMBOL).and.not.undefined


            const owner = await rpc.getContractPropertyValue(contract, contractAddress, 'owner', root.address)

            expect(owner).eq(root.address)

        })

        it('Proxy registry identification: should match configured value', async function(){

            const proxyRegAddr = await rpc.getContractPropertyValue(contract, contractAddress, 'proxyRegistryAddress', root.address)

            expect(proxyRegAddr).eq(process.env.PROXY_REGISTRY_ADDRESS).and.not.undefined

        })

        it('Total supply: should match zero before any mint done', async function(){

            const totalSupply = await rpc.getContractPropertyValue(contract, contractAddress, 'totalSupply', root.address)

            expect(totalSupply).eq('0')

        })

    })

    describe('Token metadata', () => {

        let app: INestApplication

        after(async function(){

            await app.close()

        })

        before(async function(){

            app = await startService()

        })

        it('baseTokenURI: should match configured value', async function(){

            const baseTokenURI = await rpc.getContractPropertyValue(contract, contractAddress, 'baseTokenURI', root.address)

            expect(baseTokenURI).eq(process.env.ERC721_BASE_TOKEN_URI).and.not.undefined

        })

        it('tokenURI: should match value comosed from preconfigured', async function(){

            const tokenURI = await rpc.getContractPropertyValue(contract, contractAddress, 'tokenURI', root.address, [1])

            expect(tokenURI).eq(process.env.ERC721_BASE_TOKEN_URI+'1')
            
        })

        it('Get asset metadata from local API: should succeed & match valid structure', async function(){

            // get base path for assets metadata controller
            const path = process.env.ERC721_BASE_TOKEN_URI!.replace(/https?\:\/\/([^\/]+)?/, '')

            const tokenId = '1'

            const metadata = await chai.request(app.getHttpServer())
                .get(path+tokenId)
                .query({}) as { body: IAssetMetadata }

            expect(metadata.body).not.undefined
            expect(typeof(metadata.body.name)).eq('string')
            expect(typeof(metadata.body.description)).eq('string')
            expect(typeof(metadata.body.external_url)).eq('string')
            expect(typeof(metadata.body.image)).eq('string')

        })

    })

    describe('Airdropping', () => {

        it('Call native `mintTo`: should error since disabled in favor to `airdrop`', async function(){

            const receiver = await rpc.createAccount()

            let failed = false

            try {

                await rpc.prepareContractCallTransaction(
                    contract, contractAddress, 'mintTo', [receiver.address], root.privateKey
                )

            } catch(ex) {

                const error = (ex as Error).toString()

                expect(error).match(/is not a function/)
                failed = true

            }

            expect(failed).eq(true)

        })

        it('Verify all token IDs applied for airdrop: should match configured requirement', async function(){

            const reservedForAirdrop = +(await rpc.getContractPropertyValue(
                contract, contractAddress, 'RESERVE_FOR_AIRDROPS', root.address
            ))

            await Promise.all(new Array(reservedForAirdrop).fill(0).map(async(_, idx) => {

                const tokenId = idx + 1;

                const isApplied = await rpc.getContractPropertyValue(
                    contract, contractAddress, 'isAppliedForAirdrop', root.address, [tokenId]
                )
                
                expect(isApplied).eq(true)

            }))
            

        })

        it('Perform airdrop action: should update totalSupply and token balances', async function(){

            const receiver = await rpc.createAccount()

            const airdrop = await rpc.prepareContractCallTransaction(
                contract, contractAddress, 'airdrop', [receiver.address, 1], root.privateKey
            )

            const rcpt = await rpc.sendContractCallTransaction(airdrop.signed)

            expect(rcpt.status).eq(true)

            const balanceOf = await rpc.getContractPropertyValue(
                contract, contractAddress, 'balanceOf', receiver.address, [receiver.address]
            )

            expect(balanceOf).eq('1')

            const ownerOf = await rpc.getContractPropertyValue(
                contract, contractAddress, 'ownerOf', receiver.address, ['1']
            )

            expect(ownerOf).eq(receiver.address)

            const totalSupply = await rpc.getContractPropertyValue(
                contract, contractAddress, 'totalSupply', receiver.address
            )

            expect(totalSupply).eq('1')

        })

    })

    describe('Whitelisting', () => {

        let receiver: EthAccount

        before(async function(){

            receiver = await rpc.createAccount()

            await rpc.sendETH(root.privateKey, receiver.address, '0.01')

        })

        it('Read isWhitelisted for non-whitelisted account: should match false', async function(){

            const isWhitelisted = await rpc.getContractPropertyValue(
                contract, contractAddress, 'isWhitelisted', receiver.address, [receiver.address]
            )

            expect(isWhitelisted).eq(false)

        })

        it('Apply for whitelisting: should succeed', async function(){

            const whitelistTx = await rpc.prepareContractCallTransaction(
                contract, contractAddress, 'applyForWhitelist', [], receiver.privateKey
            )

            const rcpt = await rpc.sendContractCallTransaction(whitelistTx.signed)

            expect(rcpt.status).eq(true)

            const isWhitelisted = await rpc.getContractPropertyValue(
                contract, contractAddress, 'isWhitelisted', receiver.address, [receiver.address]
            )

            expect(isWhitelisted).eq(true)

        })

    })

    describe('Withdrawal', () => {

        let initialBalance: string

        it('Mint another token: should refill contract balance successfully', async function(){

            const isPresale = await rpc.getContractPropertyValue(
                contract, contractAddress, 'isPresale', root.address
            )

            const [mintPrice, mintPriceUnit] = process.env[isPresale ? 'PRESALE_TOKEN_PRICE_ETH' : 'SALE_TOKEN_PRICE_ETH']!
                .split(/\s+/g) as [string, 'ether']

            const mintPriceValue = rpc.client.utils.toWei(mintPrice, mintPriceUnit)

            const mintCall = await rpc.prepareContractCallTransaction(
                contract, contractAddress, 'mintTokens', [1], root.privateKey, mintPriceValue
            )

            const rcpt = await rpc.sendContractCallTransaction(mintCall.signed)

            expect(rcpt.status).eq(true);

            initialBalance = await rpc.client.eth.getBalance(root.address)

        })

        it('Call `withdrawAll`: should succeed & increase owner\'s balance', async function(){

            const withdrawtx = await rpc.prepareContractCallTransaction(
                contract, contractAddress, 'withdrawAll', [], root.privateKey
            )

            const rcpt = await rpc.sendContractCallTransaction(withdrawtx.signed)

            expect(rcpt.status).eq(true)

            const finalBalance = await rpc.client.eth.getBalance(root.address)

            expect(+finalBalance).above(+initialBalance)

        })

    })

    describe('Access delegation', () => {

        let contractAddress : string,
            newOwner : EthAccount

        before(async function(){

            this.timeout(0)

            const deployTx = await rpc.prepareSmartContractDeployTransaction(contract, root.privateKey)

            const deployResult = await rpc.client.eth.sendSignedTransaction(deployTx.signed.rawTransaction)

            contractAddress = deployResult.contractAddress!

            newOwner = await rpc.createAccount()

            await rpc.sendETH(root.privateKey, newOwner.address, '0.01')

        })

        it('transferOwnership: should succeed', async function(){

            const transferTx = await rpc.prepareContractCallTransaction(
                contract, contractAddress, 'transferOwnership', [newOwner.address], root.privateKey
            )

            const rcpt = await rpc.sendContractCallTransaction(transferTx.signed)

            expect(rcpt.status).eq(true)

            const owner = await rpc.getContractPropertyValue(
                contract, contractAddress, 'owner', root.address
            )

            expect(owner).eq(newOwner.address)

        })

        it('renounceOwnership: should succeed', async function(){

            const renounceTx = await rpc.prepareContractCallTransaction(
                contract, contractAddress, 'renounceOwnership', [], newOwner.privateKey
            )
            
            const rcpt = await rpc.sendContractCallTransaction(renounceTx.signed)

            expect(rcpt.status).eq(true)

            const owner = await rpc.getContractPropertyValue(
                contract, contractAddress, 'owner', root.address
            )

            expect(owner).eq('0x0000000000000000000000000000000000000000')

        })

    })

    describe('Presale minting', () => {

        let contractAddress : string, contract: CompiledEthContractObject

        before('Recompile for presale test', async function() {

            this.timeout(0)

            process.env.PRESALE_START_DELAY_SECONDS = '0'
            process.env.PRESALE_DURATION_SECONDS = '86400'
            process.env.RESERVE_FOR_AIRDROPS = '2'
            process.env.RESERVE_FOR_PRESALE = '5'
            process.env.MAX_PRESALE_USER_MINTED_TOKENS_PER_TX = '2'
            process.env.MAX_PRESALE_TOKENS_MINT = '3'
            process.env.MAX_TOKENS = '10'

            const compiled = compileSolidityContract(
                    join(
                        process.cwd(), 'src', 'contracts', 'main.sol'
                    )
                ),
                contracts = compiled.contracts['main.sol'],
                contractNames = Object.keys(contracts),
                mainContractName = contractNames.reverse()[0]

            contract = contracts[mainContractName]

            const deployTx = await rpc.prepareSmartContractDeployTransaction(contract, root.privateKey)

            const deployResult = await rpc.client.eth.sendSignedTransaction(deployTx.signed.rawTransaction)

            contractAddress = deployResult.contractAddress!

        })

        it('Check whether it is a presale', async function(){

            const isPresale = await rpc.getContractPropertyValue(
                contract, contractAddress, 'isPresale', root.address
            )

            expect(isPresale).eq(true)

        })

        it('Mint at presale while not whitelisted: should error', async function(){

            this.timeout(0)

            const receiver = await rpc.createAccount()

            await rpc.sendETH(root.privateKey, receiver.address, '0.01');

            const [mintPrice, mintPriceUnit] = process.env.PRESALE_TOKEN_PRICE_ETH!
                .split(/\s+/g) as [string, 'ether']

            const mintPriceValue = rpc.client.utils.toWei(mintPrice, mintPriceUnit)

            let failed = false

            try {

                const mintTx = await rpc.prepareContractCallTransaction(
                    contract, contractAddress, 'mintTokens', [1], receiver.privateKey, mintPriceValue
                )

                await rpc.sendContractCallTransaction(mintTx.signed)

            } catch(ex) {

                const error = (ex as Error).toString()

                expect(error).match(/only available for whitelisted users/)
                failed = true

            }

            expect(failed).eq(true)

        })

        it('Mint one token after whitelisting: should succeed & index above airdrop reserves', async function(){

            this.timeout(0)

            const receiver = await rpc.createAccount()

            await rpc.sendETH(root.privateKey, receiver.address, '0.01');

            const whitelistTx = await rpc.prepareContractCallTransaction(
                contract, contractAddress, 'applyForWhitelist', [], receiver.privateKey
            )

            const rcpt = await rpc.sendContractCallTransaction(whitelistTx.signed)

            expect(rcpt.status).eq(true)

            const [mintPrice, mintPriceUnit] = process.env.PRESALE_TOKEN_PRICE_ETH!
                .split(/\s+/g) as [string, 'ether']

            const mintPriceValue = rpc.client.utils.toWei(mintPrice, mintPriceUnit)

            const mintTx = await rpc.prepareContractCallTransaction(
                contract, contractAddress, 'mintTokens', [1], receiver.privateKey, mintPriceValue
            )

            const mintRcpt = await rpc.sendContractCallTransaction(mintTx.signed)

            expect(mintRcpt.status).eq(true)

            const balance = await rpc.getContractPropertyValue(
                contract, contractAddress, 'balanceOf', receiver.address, [receiver.address]
            )

            expect(balance).eq('1')

            const tokenId = +(await rpc.getContractPropertyValue(
                contract, contractAddress, 'RESERVE_FOR_AIRDROPS', receiver.address
            )) + 1

            const owner = await rpc.getContractPropertyValue(
                contract, contractAddress, 'ownerOf', receiver.address, [tokenId]
            )

            expect(owner).eq(receiver.address)

            const supply = await rpc.getContractPropertyValue(
                contract, contractAddress, 'totalSupply', root.address
            )

            expect(supply).eq('1')

        })

        it('Mint amount of tokens above single-transaction limit: should error', async function(){

            this.timeout(0)

            const receiver = await rpc.createAccount()

            await rpc.sendETH(root.privateKey, receiver.address, '0.01');

            const whitelistTx = await rpc.prepareContractCallTransaction(
                contract, contractAddress, 'applyForWhitelist', [], receiver.privateKey
            )

            const rcpt = await rpc.sendContractCallTransaction(whitelistTx.signed)

            expect(rcpt.status).eq(true)

            const [mintPrice, mintPriceUnit] = process.env.PRESALE_TOKEN_PRICE_ETH!
                .split(/\s+/g) as [string, 'ether']

            const mintPriceValue = rpc.client.utils.toWei(mintPrice, mintPriceUnit)

            let failed = false 

            try {

                const mintTx = await rpc.prepareContractCallTransaction(
                    contract, contractAddress, 'mintTokens', [
                        +process.env.MAX_PRESALE_USER_MINTED_TOKENS_PER_TX! + 1
                    ], receiver.privateKey, mintPriceValue
                )

                await rpc.sendContractCallTransaction(mintTx.signed)

            } catch(ex) {

                const error = (ex as Error).toString()

                expect(error).match(/limit per transaction/)

                failed = true

            }

            expect(failed).eq(true)

        })

        it('Mint with price value provided less than expected: should error', async function(){

            this.timeout(0)

            const receiver = await rpc.createAccount()

            await rpc.sendETH(root.privateKey, receiver.address, '0.01');

            const whitelistTx = await rpc.prepareContractCallTransaction(
                contract, contractAddress, 'applyForWhitelist', [], receiver.privateKey
            )

            const rcpt = await rpc.sendContractCallTransaction(whitelistTx.signed)

            expect(rcpt.status).eq(true)

            let failed = false 

            try {

                const mintTx = await rpc.prepareContractCallTransaction(
                    contract, contractAddress, 'mintTokens', [1], receiver.privateKey, '1' // 1 wei
                )

                await rpc.sendContractCallTransaction(mintTx.signed)

            } catch(ex) {

                const error = (ex as Error).toString()

                expect(error).match(/Insufficient funds provided/)

                failed = true

            }

            expect(failed).eq(true)

        })
        
        it('Mint tokens above MAX_PRESALE_TOKENS_MINT limit: should error', async function(){

            this.timeout(0)

            const receiver = await rpc.createAccount()

            await rpc.sendETH(root.privateKey, receiver.address, '0.01')

            const whitelistTx = await rpc.prepareContractCallTransaction(
                contract, contractAddress, 'applyForWhitelist', [], receiver.privateKey
            )

            const wlRcpt = await rpc.sendContractCallTransaction(whitelistTx.signed)

            expect(wlRcpt.status).eq(true)

            const [mintPrice, mintPriceUnit] = process.env.PRESALE_TOKEN_PRICE_ETH!
                .split(/\s+/g) as [string, 'ether']

            const mintPriceValue = rpc.client.utils.toWei((+mintPrice * 2).toString(), mintPriceUnit)

            let failed = false

            try {

                // 2x2 mint exceeds limit of 3
                for(let i = 0; i < 2; i++)
                    await (async() => {

                        const mintTx = await rpc.prepareContractCallTransaction(
                            contract, contractAddress, 'mintTokens', [2], receiver.privateKey, mintPriceValue
                        )

                        await rpc.sendContractCallTransaction(mintTx.signed)
        
                    })()

            } catch(ex) {

                const error = (ex as Error).toString()

                expect(error).match(/minting tokens amount exceeded limit/)

                failed = true

            }

            expect(failed).eq(true)

        })

    })

    describe('Public sale minting', () => {

        let contractAddress : string, contract: CompiledEthContractObject

        before('Recompile for public sale test', async function() {

            this.timeout(0)

            process.env.PRESALE_START_DELAY_SECONDS = '0'
            process.env.PRESALE_DURATION_SECONDS = '0'
            process.env.RESERVE_FOR_AIRDROPS = '2'
            process.env.RESERVE_FOR_PRESALE = '5'
            process.env.MAX_PUBSALE_USER_MINTED_TOKENS_PER_TX = '2'
            process.env.MAX_PUBLIC_SALE_TOKENS_MINT = '3'
            process.env.MAX_TOKENS = '10'

            const compiled = compileSolidityContract(
                    join(
                        process.cwd(), 'src', 'contracts', 'main.sol'
                    )
                ),
                contracts = compiled.contracts['main.sol'],
                contractNames = Object.keys(contracts),
                mainContractName = contractNames.reverse()[0]

            contract = contracts[mainContractName]

            const deployTx = await rpc.prepareSmartContractDeployTransaction(contract, root.privateKey)

            const deployResult = await rpc.client.eth.sendSignedTransaction(deployTx.signed.rawTransaction)

            contractAddress = deployResult.contractAddress!

            await setTimeout(1_000); // wait until presale surely ends

        })

        it('Check whether it is a public sale', async function() {

            const isPublicSale = await rpc.getContractPropertyValue(
                contract, contractAddress, 'isPublicSale', root.address
            )

            expect(isPublicSale).eq(true)

        })

        it('Mint at public sale while not whitelisted: should succeed', async function(){

            this.timeout(0)

            const receiver = await rpc.createAccount()

            await rpc.sendETH(root.privateKey, receiver.address, '0.01');

            const [mintPrice, mintPriceUnit] = process.env.SALE_TOKEN_PRICE_ETH!
                .split(/\s+/g) as [string, 'ether']

            const mintPriceValue = rpc.client.utils.toWei(mintPrice, mintPriceUnit)

            const mintTx = await rpc.prepareContractCallTransaction(
                contract, contractAddress, 'mintTokens', [1], receiver.privateKey, mintPriceValue
            )

            const rcpt = await rpc.sendContractCallTransaction(mintTx.signed)

            expect(rcpt.status).eq(true)

            const tokenId = +(await rpc.getContractPropertyValue(
                contract, contractAddress, 'RESERVE_FOR_AIRDROPS', receiver.address
            )) + 1

            const owner = await rpc.getContractPropertyValue(
                contract, contractAddress, 'ownerOf', receiver.address, [tokenId]
            )

            expect(owner).eq(receiver.address)

        })

        it('Mint amount of tokens above single-transaction limit: should error', async function(){

            this.timeout(0)

            const receiver = await rpc.createAccount()

            await rpc.sendETH(root.privateKey, receiver.address, '0.01');

            const [mintPrice, mintPriceUnit] = process.env.SALE_TOKEN_PRICE_ETH!
                .split(/\s+/g) as [string, 'ether']

            const mintPriceValue = rpc.client.utils.toWei(mintPrice, mintPriceUnit)

            let failed = false 

            try {

                const mintTx = await rpc.prepareContractCallTransaction(
                    contract, contractAddress, 'mintTokens', [
                        +process.env.MAX_PUBSALE_USER_MINTED_TOKENS_PER_TX! + 1
                    ], receiver.privateKey, mintPriceValue
                )

                await rpc.sendContractCallTransaction(mintTx.signed)

            } catch(ex) {

                const error = (ex as Error).toString()

                expect(error).match(/limit per transaction/)

                failed = true

            }

            expect(failed).eq(true)

        })

        it('Mint with price value provided less than expected: should error', async function() {

            this.timeout(0)

            const receiver = await rpc.createAccount()

            await rpc.sendETH(root.privateKey, receiver.address, '0.01');

            let failed = false 

            try {

                const mintTx = await rpc.prepareContractCallTransaction(
                    contract, contractAddress, 'mintTokens', [1], receiver.privateKey, '1' // 1 wei
                )

                await rpc.sendContractCallTransaction(mintTx.signed)

            } catch(ex) {

                const error = (ex as Error).toString()

                expect(error).match(/Insufficient funds provided/)

                failed = true

            }

            expect(failed).eq(true)

        })

        it('Mint tokens above MAX_PUBLIC_SALE_TOKENS_MINT limit: should error', async function(){

            this.timeout(0)

            const receiver = await rpc.createAccount()

            await rpc.sendETH(root.privateKey, receiver.address, '0.01')

            const [mintPrice, mintPriceUnit] = process.env.SALE_TOKEN_PRICE_ETH!
                .split(/\s+/g) as [string, 'ether']

            const mintPriceValue = rpc.client.utils.toWei((+mintPrice * 2).toString(), mintPriceUnit)

            let failed = false

            try {

                // 2x2 mint exceeds limit of 3
                for(let i = 0; i < 2; i++)
                    await (async() => {

                        const mintTx = await rpc.prepareContractCallTransaction(
                            contract, contractAddress, 'mintTokens', [2], receiver.privateKey, mintPriceValue
                        )

                        await rpc.sendContractCallTransaction(mintTx.signed)
        
                    })()

            } catch(ex) {

                const error = (ex as Error).toString()

                expect(error).match(/minting tokens amount exceeded limit/)

                failed = true

            }

            expect(failed).eq(true)

        })

    })
    
})