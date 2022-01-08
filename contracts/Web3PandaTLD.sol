// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "./lib/strings.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Web3PandaTLD is ERC721, Ownable {
  using strings for string;

  // STATE
  uint public price; // price (how much a user needs to pay for a domain)
  bool public buyingEnabled; // buying domains enabled (true/false)
  address public factoryAddress; // Web3PandaTLDFactory address
  uint public royaltyPercentage; // percentage of each domain purchase that goes to Web3Panda DAO

  // domain data struct:
    // - username (domain name that goes before the TLD name; example: "tempetechie" in "tempetechie.web3")
    // - tokenId
    // - address (domain holder address)
    // - description
    // - pfpAddress (user can define an NFT address as their PFP - but only if they really own it)
    // - pfpTokenId
    // - urlRedirect
  
  // mapping (username => struct)

  // EVENTS

  // CONSTRUCTOR
  constructor(
    string memory _name,
    string memory _symbol,
    address _tldOwner,
    uint _domainPrice,
    bool _buyingEnabled,
    uint _royalty,
    address _factoryAddress
  ) ERC721(_name, _symbol) {
    price = _domainPrice;
    buyingEnabled = _buyingEnabled;
    royaltyPercentage = _royalty;
    factoryAddress = _factoryAddress;

    transferOwnership(_tldOwner);
  }

  // READ

  // WRITE

  // function mint() payable
    // username must not have dot in the name

  /**
    * @dev Hook that is called before any token transfer. This includes minting
    * and burning.
    *
    * Calling conditions:
    *
    * - When `from` and `to` are both non-zero, ``from``'s `tokenId` will be
    * transferred to `to`.
    * - When `from` is zero, `tokenId` will be minted for `to`.
    * - When `to` is zero, ``from``'s `tokenId` will be burned.
    * - `from` and `to` are never both zero.
    *
    * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
    */
  function _beforeTokenTransfer(
      address from,
      address to,
      uint256 tokenId
  ) internal override virtual {
    // change address in struct data (or create a struct if it doesn't exist yet)
    // call the function that checks if user with some tokenId still owns their chosen pfp
  }

  // function: check if user with some tokenId still owns their chosen pfp

  // OWNER

    // create a new domain for a specified address for free

    // change the payment amount for a new domain

    // enable/disable buying domains (except for the owner)
  
  // FACTORY OWNER (current owner address of Web3PandaTLDFactory)

    // change percentage of each domain purchase that goes to Web3Panda DAO
}
