// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

// @title Test ERC20 Contract
contract NFTContract is ERC721 {

    constructor() ERC721("Test", "TST") {

        _mint(msg.sender, 1000000);

    }

}