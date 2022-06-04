// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/IBasePunkTLDFactory.sol";
import "../interfaces/IBasePunkTLD.sol";
import "../lib/strings.sol";

/// @title Punk Domains Resolver v1
/// @author Tempe Techie
/// @notice This contract resolves all punk domains and TLDs on the particular blockchain where it is deployed
contract PunkResolverV1 is OwnableUpgradeable {
  using strings for string;

  mapping (address => bool) public deprecatedTlds; // deprecate an address, not TLD name
  address[] public factories;

  // TODO:
  // upgradable contract
  // use _msgSender()
  // read: a list of all existing Factory contracts
  // read: a list of all deprecated TLD contracts?
  // read: return a list of all existing active TLDs
  // read: getDomainHolder(domainName, tld)
    // loop through factory contracts to find the TLD address (or call getTldAddress)
    // getDomainHolder from the TLD contract
  // read: getDefaultDomain(addr, tld) - reverse resolver for a specific TLD
  // read: getDefaultDomains(addr) - reverse resolver for all TLDs (returns a list of default domains for a given address)
  // read: getDomainData (?)
  // read: getDomainTokenUri (?)
  // read: getTldAddress
  // read: getTldFactoryAddress
  // write (only owner): add factory contract address
  // write (only owner): remove factory contract address
  // write (only owner): add deprecated TLD address
  // write (only owner): remove deprecated TLD address
}