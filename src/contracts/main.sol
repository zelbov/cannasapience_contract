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

    uint256 public constant MAX_PRESALE_USER_MINTED_TOKENS_PER_TX = __MAX_PRESALE_USER_MINTED_TOKENS_PER_TX__;

    uint256 public constant MAX_PUBSALE_USER_MINTED_TOKENS_PER_TX = __MAX_PUBSALE_USER_MINTED_TOKENS_PER_TX__;

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

        return _tokenId <= RESERVE_FOR_AIRDROPS && _tokenId > 0;

    }

    function isAppliedForPresale(uint256 _tokenId) public pure returns(bool) {

        return _tokenId > RESERVE_FOR_AIRDROPS && _tokenId <= RESERVE_FOR_WHITELISTED + RESERVE_FOR_AIRDROPS;

    }

    Counters.Counter private _airdropped;

    function airdrop(address recipient, uint256 _tokenId) public onlyOwner {

        require(isAppliedForAirdrop(_tokenId), "This token is not applied for airdrop");

        _safeMint(recipient, _tokenId);
        _airdropped.increment();

    }

    function totalSupply() public view returns(uint256) {
        return _nextTokenId.current() + _airdropped.current() - 1;
    }

    // User-scope bulk minting

    function mintTokens(uint256 numOfTokens) public payable {

        require(isPresale() || isPublicSale(), "Only available during presale or public sale");

        uint256 offset = _nextTokenId.current() + RESERVE_FOR_AIRDROPS;
        uint256 currentBalance = balanceOf(msg.sender);

        if(isPresale()) {
            require(
                numOfTokens <= MAX_PRESALE_USER_MINTED_TOKENS_PER_TX,
                "Mint limit per transaction during presale is __MAX_PRESALE_USER_MINTED_TOKENS_PER_TX__"
            );
            require(isWhitelisted(msg.sender), "Minting at presale only available for whitelisted users");
            require(
                currentBalance <= MAX_PRESALE_TOKENS_MINT - numOfTokens,
                string(abi.encodePacked(
                    "Direct minting tokens amount exceeded limit of __MAX_PRESALE_TOKENS_MINT__ at pre-sale. ",
                    "Requested ", Strings.toString(numOfTokens), " while got ", Strings.toString(currentBalance)
                ))
            );
            require(
                offset < RESERVE_FOR_WHITELISTED + RESERVE_FOR_AIRDROPS + 1,
                "No more reserved tokens left during presale"
            );
        } else {
            require(
                numOfTokens <= MAX_PUBSALE_USER_MINTED_TOKENS_PER_TX,
                "Mint limit per transaction during presale is __MAX_PUBSALE_USER_MINTED_TOKENS_PER_TX__"
            );
            require(
                balanceOf(msg.sender) <= MAX_PUBLIC_SALE_TOKENS_MINT - numOfTokens,
                string(abi.encodePacked(
                    "Direct minting tokens amount exceeded limit of __MAX_PUBLIC_SALE_TOKENS_MINT__ at public sale. ",
                    "Requested ", Strings.toString(numOfTokens), " while got ", Strings.toString(currentBalance)
                ))
            );
            require(offset + numOfTokens <= MAX_TOKENS, "Insufficient tokens supply remaining for purchase");
        }

        uint256 mul = isPresale() ? PRESALE_TOKEN_VALUE : PUBLIC_SALE_TOKEN_VALUE;
        uint256 expected = numOfTokens * mul;
        
        require(
            expected <= msg.value, 
            string(abi.encodePacked(
                "Insufficient funds provided. Expected ",
                Strings.toString(expected),
                " wei, got ",
                Strings.toString(msg.value)
            ))
        );

        for(uint256 _tokenId = offset; _tokenId < offset + numOfTokens; _tokenId++){
            _safeMint(msg.sender, _tokenId);
            _nextTokenId.increment();
        }

    }

    // Withdrawal

    function withdrawAll() public onlyOwner {

        payable(msg.sender).transfer(address(this).balance);

    }

}
