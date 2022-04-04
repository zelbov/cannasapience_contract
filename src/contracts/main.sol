// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "./ERC721Tradable.sol";

/**
 * @title Cannasapience NFT contract base
 */
contract __CONTRACT_NAME__ is ERC721Tradable {
    using Counters for Counters.Counter;

    Counters.Counter private currentTokenId;

    constructor(address _proxyRegistryAddress) ERC721Tradable("__TOKEN_NAME__", "__TOKEN_SYMBOL__", _proxyRegistryAddress) public {}

    function baseTokenURI() public view returns (string memory) {
        return "__ERC721_BASE_TOKEN_URI__";
    }

    function tokenURI(uint256 _tokenId) public view returns (string) {
        return Strings.strConcat(
            baseTokenURI(),
            Strings.uint2str(_tokenId)
        );
    }

}
