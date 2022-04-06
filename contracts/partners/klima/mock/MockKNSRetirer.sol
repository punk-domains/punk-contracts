// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

// Mock token contract for testing purposes only
contract MockKNSRetirer {

  IERC20 public immutable usdc; // USDC contract

  // CONSTRUCTOR
  constructor(address _usdcAddress) {
    usdc = IERC20(_usdcAddress);
  }

  function retireAndKI(uint _USDCAmt, address beneficiary, string memory domainName) public {
    usdc.transferFrom(msg.sender, address(this), _USDCAmt); // transfer USDC to this contract address

    console.log("USDC amount in mwei: %s", _USDCAmt);
    console.log("Beneficiary: %s", beneficiary);
    console.log("Domain name: %s", domainName);
  }

}
