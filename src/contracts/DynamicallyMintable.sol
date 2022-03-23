// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./NFT.sol";

contract NFT_Mintable is NFTContract {

    constructor() NFTContract() {}

    function mint() public returns (NFTContract) {

        NFTContract mintedContract = new NFTContract();
        return mintedContract;

    }

}