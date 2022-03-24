// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock token contract for testing purposes only
contract MockErc20Token is ERC20 {
  
  constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {
    mint(msg.sender, 1000*(10**18)); // 1000 mock tokens to deployer
  }

  function mint(address receiver, uint amount) public {
    _mint(receiver, amount);
  }
}
