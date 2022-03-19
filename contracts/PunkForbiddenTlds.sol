// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PunkForbiddenTlds is Ownable {
  // The purpose of this contract is to hold a registry TLD names that are either forbidden or have been already created/used.
  // There may be multiple Punk TLD Factory contracts and they need a joint registry of used or forbidden TLDs.

  mapping (string => bool) public forbidden; // forbidden TLDs
  mapping (address => bool) public factoryAddresses; // list of TLD factories that are allowed to add forbidden TLDs

  event ForbiddenTldAdded(address indexed sender, string indexed tldName);
  event ForbiddenTldRemoved(address indexed sender, string indexed tldName);

  event FactoryAddressAdded(address indexed sender, address indexed fAddress);
  event FactoryAddressRemoved(address indexed sender, address indexed fAddress);

  modifier onlyFactory {
      require(factoryAddresses[msg.sender] == true, "Caller is not a factory address.");
      _;
   }

  constructor() {
    forbidden[".eth"] = true;
    forbidden[".com"] = true;
    forbidden[".org"] = true;
    forbidden[".net"] = true;
  }

  // PUBLIC
  function isTldForbidden(string memory _name) public view returns (bool) {
    return forbidden[_name];
  }

  // FACTORY
  function addForbiddenTld(string memory _name) external onlyFactory {
    forbidden[_name] = true;
    emit ForbiddenTldAdded(msg.sender, _name);
  }

  // OWNER
  function ownerAddForbiddenTld(string memory _name) external onlyOwner {
    forbidden[_name] = true;
    emit ForbiddenTldAdded(msg.sender, _name);
  }

  function removeForbiddenTld(string memory _name) external onlyOwner {
    forbidden[_name] = false;
    emit ForbiddenTldRemoved(msg.sender, _name);
  }

  function addFactoryAddress(address _fAddr) external onlyOwner {
    factoryAddresses[_fAddr] = true;
    emit FactoryAddressAdded(msg.sender, _fAddr);
  }

  function removeFactoryAddress(address _fAddr) external onlyOwner {
    factoryAddresses[_fAddr] = false;
    emit FactoryAddressRemoved(msg.sender, _fAddr);
  }
}