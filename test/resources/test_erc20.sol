// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// @title Test ERC20 Contract
contract TestERC20 is ERC20 {

    constructor() ERC20("Test", "TST") {

        _mint(msg.sender, 1000000);

    }

}