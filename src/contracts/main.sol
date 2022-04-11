// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "./ERC721Tradable.sol";

// HINT: all definitions enclosed with "__" are representations of defined values in compiler's ENV
// (see .env.sample in project sources)

/**
 * @title Cannasapience NFT contract base
 */
contract __CONTRACT_NAME__ is ERC721Tradable {
    using Counters for Counters.Counter;

    constructor() ERC721Tradable("__TOKEN_NAME__", "__TOKEN_SYMBOL__", address(__PROXY_REGISTRY_ADDRESS__)) {
        
        // Set initial _nextTokenId value to next ID after last one reserved for airdrop
        for(uint256 i = 0; i < RESERVE_FOR_AIRDROPS; i++) {
            _nextTokenId.increment();
        }
        
        // whitelist contract owner's address & instantiate an initial storage to avoid gas cost increase at next application
        applyForWhitelist();
    
        setPresaleStartTime(block.timestamp + __PRESALE_START_DELAY_SECONDS__);
    
    }

    function baseTokenURI() override public pure returns (string memory) {
        return "__ERC721_BASE_TOKEN_URI__";
    }

    // Constants

    uint256 public constant MAX_TOKENS = __MAX_TOKENS__;

    uint256 public constant RESERVE_FOR_AIRDROPS = __RESERVE_FOR_AIRDROPS__;

    uint256 public constant RESERVE_FOR_WHITELISTED = __RESERVE_FOR_PRESALE__;

    uint256 public constant MAX_USER_MINTED_TOKENS_PER_TX = __MAX_USER_MINTED_TOKENS_PER_TX__;

    uint256 public constant MAX_PRESALE_TOKENS_MINT = __MAX_PRESALE_TOKENS_MINT__;

    uint256 public constant MAX_PUBLIC_SALE_TOKENS_MINT = __MAX_PUBLIC_SALE_TOKENS_MINT__;

    uint256 public constant PRESALE_TOKEN_VALUE = __PRESALE_TOKEN_PRICE_ETH__;

    uint256 public constant PUBLIC_SALE_TOKEN_VALUE = __SALE_TOKEN_PRICE_ETH__;

    // Whitelising

    mapping(address => bool) private whitelisted;

    function isWhitelisted(address user) public view returns(bool) {

        return !!whitelisted[user];

    }

    function applyForWhitelist() public {
        
        require(!isWhitelisted(msg.sender), "Already whitelisted");

        whitelisted[msg.sender] = true;
    
    }

    // Periods

    uint256 private PRESALE_START = 0;
    uint256 private PRESALE_END = 0;

    function setPresaleStartTime(uint256 time) private onlyOwner {

        // initial presale start time is being set withing constructor call 
        // and cannot be modified further (re-entrancy prevention)
        require(PRESALE_START == 0 && PRESALE_END == 0, "Presale start & end time already assigned");

        PRESALE_START = time;
        PRESALE_END = PRESALE_START + __PRESALE_DURATION_SECONDS__;

    }

    function presaleStartTime() public view returns(uint256) { return PRESALE_START; }

    function publicSaleStartTime() public view returns(uint256) { return PRESALE_END; }

    function isPresale() public view returns(bool) {

        return block.timestamp >= PRESALE_START && block.timestamp < PRESALE_END;

    }

    function isPublicSale() public view returns(bool) {

        return block.timestamp >= PRESALE_END;

    }

    // Airdrops & presale functions

    function isAppliedForAirdrop(uint256 _tokenId) public pure returns(bool) {

        return _tokenId <= RESERVE_FOR_AIRDROPS;

    }

    function isAppliedForPresale(uint256 _tokenId) public pure returns(bool) {

        return _tokenId > RESERVE_FOR_AIRDROPS && _tokenId <= RESERVE_FOR_WHITELISTED + RESERVE_FOR_AIRDROPS;

    }

    function airdrop(address recipient, uint256 _tokenId) public onlyOwner {

        require(isAppliedForAirdrop(_tokenId), "This token is not applied for airdrop");

        _safeMint(recipient, _tokenId);

    }

    // User-scope bulk minting

    function mintTokens(uint256 numOfTokens) public payable {

        require(numOfTokens <= MAX_USER_MINTED_TOKENS_PER_TX, "Mint limit per tx is __MAX_USER_MINTED_TOKENS_PER_TX__");
        require(isPresale() || isPublicSale(), "Only available during presale or public sale");
        require(isPresale() && isWhitelisted(msg.sender) || isPublicSale(), "Minting at presale only available for whitelisted users");

        uint256 mul = isPresale() ? PRESALE_TOKEN_VALUE : isPublicSale() ? PUBLIC_SALE_TOKEN_VALUE : 0;
        uint256 expected = numOfTokens * mul;
        uint256 offset = _nextTokenId.current();

        require(offset < RESERVE_FOR_WHITELISTED + RESERVE_FOR_AIRDROPS + 1, "No more reserved tokens left");

        if(isPresale())
            require(
                balanceOf(msg.sender) <= MAX_PRESALE_TOKENS_MINT - numOfTokens,
                "Direct minting tokens amount exceeded limit of __MAX_PRESALE_TOKENS_MINT__ at pre-sale"
            );
        if(isPublicSale()) 
            require(
                balanceOf(msg.sender) <= MAX_PUBLIC_SALE_TOKENS_MINT - numOfTokens,
                "Direct minting tokens amount exceeded limit of __MAX_PUBLIC_SALE_TOKENS_MINT__ at public sale"
            );

        //TODO: check whether supply exceeds MAX_PRESALE_TOKENS during presale

        require(expected > 0, "Bulk minting not allowed at this time");
        require(
            expected <= msg.value, 
            string(abi.encodePacked(
                "Insufficient funds provided. Expected ",
                Strings.toString(expected),
                " wei, got ", Strings.toString(msg.value)
            ))    
        );
        require(offset + numOfTokens <= MAX_TOKENS, "Insufficient tokens supply remaining for purchase");

        for(uint256 _tokenId = offset + 1; _tokenId < offset + numOfTokens + 1; _tokenId++){
            _safeMint(msg.sender, _tokenId);
            _nextTokenId.increment();
        }

    }

}
