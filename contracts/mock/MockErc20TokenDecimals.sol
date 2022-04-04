// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@rari-capital/solmate/src/tokens/ERC20.sol";

// Mock token contract for testing purposes only
contract MockErc20TokenDecimals is ERC20 {
  
  constructor(
    string memory _name, 
    string memory _symbol,
    uint8 _decimals
  ) ERC20(_name, _symbol, _decimals) {
    mint(msg.sender, 1000*(10**_decimals)); // 1000 mock tokens to deployer
  }

  function mint(address receiver, uint amount) public {
    _mint(receiver, amount);
  }
}
