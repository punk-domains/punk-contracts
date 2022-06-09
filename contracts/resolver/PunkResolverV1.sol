// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../interfaces/IBasePunkTLDFactory.sol";
import "../interfaces/IBasePunkTLD.sol";
import "../lib/strings.sol";

/// @title Punk Domains Resolver v1
/// @author Tempe Techie
/// @notice This contract resolves all punk domains and TLDs on the particular blockchain where it is deployed
contract PunkResolverV1 is Initializable, OwnableUpgradeable {
  using strings for string;

  mapping (address => bool) public isTldDeprecated; // deprecate an address, not TLD name
  address[] public factories;

  /*
  struct TldData {
    address tldAddress;
    string tldName;
  }*/

  // initializer (only for V1!)
  function initialize() public initializer {
    __Context_init_unchained();
    __Ownable_init_unchained();
  }

  // READ
  function getDomainHolder(string calldata _domainName, string calldata _tld) public view returns(address) {
    uint256 fLength = factories.length;
    for (uint256 i = 0; i < fLength;) {
      address tldAddr = IBasePunkTLDFactory(factories[i]).tldNamesAddresses(_tld);

      if (tldAddr != address(0) && !isTldDeprecated[tldAddr]) {
        return address(IBasePunkTLD(tldAddr).getDomainHolder(_domainName));
      }

      unchecked { ++i; }
    }
  }

  function getFactoriesArray() public view returns(address[] memory) {
    return factories;
  }

  /// @notice get a list of all active TLDs across all factories
  /*
  function getTldAddressesArray() public view returns(address[] memory) {
    // TODO: address or string or both? (struct?)
    address[] memory _tldAddresses = new address[](8); // TODO: count how many TLDs there are

    uint256 fLength = factories.length;
    for (uint256 i = 0; i < fLength;) {
      string[] memory tldNames = IBasePunkTLDFactory(factories[i]).getTldsArray();

      for (uint256 j = 0; j < tldNames.length; ++j) {
        _tldAddresses.push(IBasePunkTLDFactory(factories[i]).tldNamesAddresses(tldNames[j]));
      }

      unchecked { ++i; }
    }
  } 
  */

  // OWNER
  function addFactoryAddress(address _factoryAddress) external onlyOwner {
    factories.push(_factoryAddress);
  }

  function removeFactoryAddress(uint _addrIndex) external onlyOwner {
    factories[_addrIndex] = factories[factories.length - 1];
    factories.pop();
  }

  // TODO:
  // upgradable contract
  // use _msgSender()
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
  // write (only owner): add deprecated TLD address
  // write (only owner): remove deprecated TLD address
}