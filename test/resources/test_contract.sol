// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// @title Test smart contract
contract TestContract {

    address private owner;

    mapping (address => uint128) private balances;

    uint128 constant public initial_supply = 1000000;

    uint128 public supply;

    constructor() {

        owner = msg.sender;
        supply = initial_supply;

    }

    function mint(address receiver, uint128 amount) public {

        require(msg.sender == owner);
        require(amount <= supply, "Mint amount should be less than remaining supply");
        balances[receiver] += amount;
        supply -= amount;

    }

    function send(address receiver, uint128 amount) public {

        require(amount <= balances[msg.sender], "Insufficient balance.");
        balances[msg.sender] -= amount;
        balances[receiver] += amount;

    }

    function getBalance(address holder) public view returns(uint128 balance) {

        balance = balances[holder];

    }

}