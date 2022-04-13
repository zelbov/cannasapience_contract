# Cannasapience NFT

Installation & usage instructions are provided within this README.

## Requirements

Common:

- `Node.js` (ver. >= 16)

Dev/test local environment additionally requires:

- `Docker` (any version that provides `docker-compose` and supports `docker-compose.yml` configuration files of version >= 3.7)

For deployment into production, or public testnet chain, it is recommended to use `Infura` project API endpoint (see configuration example `.env.sample`) or self-hosted mainnet node (light sync is fine)

## Initial setup steps (all environments)

- `npm i` will install all required dependencies
- `npm run build` will bundle executables for further contract deployment and API service instantiation (if needed, see `API usage` section below). Also, all automated tests provided should be also bundled before their execution.

Please note that all further project commands require building these executables with `npm run build`.
For development environment, there is an `npm run watch` command that will enable on-the-fly bundling (watch mode) during development process.

## Configuration

To properly configure a project before deployment and/or API service launch, it is required to create `.env` file with same strucure as provided `.env.sample` file contains.

*Environment variables*:

All following variables defined in project environment configuration file are **REQUIRED**:

| *Variable* | *Definition* |
| --- | --- |
| WALLET_API_HOST | RPC API host\*. Can also contain path, but should not contain protocol definition (e.g. `infura.io/v3/<projectID>`) |
| WALLET_API_PORT | RPC API port\*. For external RPC endpoints with no port specified in URL, should be empty value, but not pruned from config (required) |
| WALLET_API_PROTO | RPC API protocol\* specified in URL (`http` or `https`) |
| ETH_WALLET_ADDRESS | A wallet address of project owner |
| ETH_WALLET_PKEY | A project owner's wallet private key that will be used while deploying contracts and testing transactiosn |
| API_PORT | Internal assets server API port |
| ERC721_BASE_TOKEN_URI | A value that should be returned by `baseTokenUri()` contract call. Inserted into contract code using ENV substitution |
| CONTRACT_NAME | A main entrypoint contract name. Inserted into contract code using ENV substitution |
| TOKEN_NAME | Token name that will be displayed on token listing platforms (explorer, marketplace) |
| TOKEN_SYMBOL | Token symbol that will be displayted on token listing platforms (explorer, marketplace) |
| PRESALE_TOKEN_PRICE_ETH | Pre-sale token price. Can only match Ether value definition format (e.g. `0.1 ether` or `10000 wei`) |
| SALE_TOKEN_PRICE_ETH | Public sale token price. Can only match Ether value definition format (e.g. `0.1 ether` or `10000 wei`) |
| PRESALE_START_DELAY_SECONDS | Delay in seconds between contract deployment block sealing timestamp and actual rough time when a pre-sale should start (e.g. 86400 = ~24 hours after contract deployment) |
| PRESALE_DURATION_SECONDS | Pre-sale duration in seconds |
| RESERVE_FOR_AIRDROPS | Number of tokens initially reserved for airdrops. Identifies `N(RFA)`, so that tokens from `ID = 1` to `ID = N(RFA)` will be airdroppable by contract owner |
| RESERVE_FOR_PRESALE | Maximum amount of tokens available to mint during presale. Identifies `N(RFP)`, so that tokens from `ID = N(RFA)+1` to `ID = N(RFP)+N(RFA)+1` will be eligible for minting during pre-sale. E.g. `N(RFA) = 15, N(RFP) = 1000` means that tokens with IDs `#1 - #15` will be reserved for Airdrops, and tokens `#16 - #1016` will be reserved for Pre-sale |
| MAX_TOKENS | Maximum amount of tokens available within a contract ever (identifies maximum token ID possible) |
| MAX_USER_MINTED_TOKENS_PER_TX | Maximum amount of tokens that users can mint within a single transaction |
| MAX_PRESALE_TOKENS_MINT | Maximum amount of tokens that a user can own during pre-sale that allows minting more directly from smart contract |
| MAX_PUBLIC_SALE_TOKENS_MINT | Maximum amount of tokens that a user can own during public sale that allows minting more directly from smart contract |
| PROXY_REGISTRY_ADDRESS | A ProxyRegistry contract address required by OpenSea for tokens buy & sell operations with gast cost optimization. See `.env.sample` for addresses used by mainnet and Rikneby testnet contracts. For local dev/test environments, any could be used |

\* Example of local RPC settings setup:

```env
WALLET_API_HOST=localhost
WALLET_API_PORT=9545
WALLET_API_PROTO=http
```

Example of Infura RPC settings setup:

```env
WALLET_API_HOST=infura.io/v3/77fe20fb588a48bdb350634eeb819b87
WALLET_API_PORT=
WALLET_API_PROTO=https
```

## Dev/Test environment setup

- `docker-compose build` will create images for all local software for full on-premises environment, that includes:
    1. Local (private) mainnet node (fullsync, mining node, for a local blockchain to work)
    2. RPC node (light sync, synced with mining node)
    3. Discovery relay to establish connection between mining node & RPC node
    4. CORS reverse proxy - for CORS validation support while running external blockchain explorer software that will connect to isolated RPC node
    5. Blockchain exlorer - `blockscout`, the most exhaustive on-premises blockchain explorer software for smart contracts development & testing in the wild
- `docker-compose up --detach` will launch all created images for further tests launch with preconfigured settings in background.
- `docker-compose logs -f <container-name>` will attach to a log output of a certain container (seek into `docker-compose.yml` for container names)
- `docker-compose down` will shut down containers & free assigned resources (incl. disk space used by services)

## Testing

- `npm test` will launch all automated unit tests provided, from `test/unit` folder.
- `npm run benchmark` will launch all automated benchmark tests provided, from `test/benchmark` folder.

*Note*: for all environments, `.env` file is used as a source configuration file, except automated tests suite which is using `.env.sample` as a configuration, ignoring `.env` file. If you want to launch automated tests using public testnet chain, or via different setup, other than preconfigured for local testing, consider modifying `.env.sample` file for that instead of `.env`

## Production or public testnet deployment (manual)

- `npm run deploy` will execute contract deployment according to project configuration provided in `.env` file. Note that this file does not appear in initial project (for security reasons) and should be copied from `.env.sample` and modified for appropriate settings

## Security notes

- Do NOT allow thrid parties to access your configuration file that you will use for deployment of contract into public mainnet (production release). This configuration will require to type a private key of an account that will be set as contract owner. By giving access to that Ethereum account to third party, you give them full control over smart contract functions & assets.
- Otherwise, you can still use private key that will be publicly available somehow (e.g. the one that is provided in initial sample configuration), but consider immediate execution of `transferOwnership` contract function after deployment, to give full control over a contract to another, well-secured address

## Built-in API for serving NFT assets & metadata

A project also contains built-in sample API that can be used to publish assets & their metadata.

*This part of project setup is OPTIONAL in case you already have your own implementation of API that is used for your assets publishing*.

Initially, it provides well-structured storage with automatic replacement of missing asset files with samples.

To start an API, you can type `npm start` after building a project with `npm run build` command.
This will instantiate NFT assets & metadata storage running at port you have specified in environment config as `API_PORT`

To make this API publicly accessible, you should consider setting it up the way it will match URI spec that you have provided in `ERC721_BASE_TOKEN_URI` config variable.
Consider a first way to achieve this is to instantiate API on port 80 on a publicly accessible server and assigning it a domain name that is defined in token base URI.

You can also use a reverse proxy, if you want to forward port 80 to a different port on a specific domain and/or implement SSL support for your API.
