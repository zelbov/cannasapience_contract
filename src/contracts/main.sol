// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./DynamicallyMintable.sol";

contract Main is NFT_Mintable, Ownable {

    constructor() NFT_Mintable() {}

}