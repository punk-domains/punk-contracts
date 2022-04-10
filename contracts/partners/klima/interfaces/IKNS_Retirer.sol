// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

interface IKNS_Retirer {

  function retireAndKI(uint _USDCAmt, address _beneficiary, string memory _domainName, string memory _retMessage) external;

}