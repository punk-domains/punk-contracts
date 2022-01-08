// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "./lib/strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Web3PandaTLD.sol";

contract Web3PandaTLDFactory is Ownable {
  using strings for string;

  // STATE
  string[] public tlds; // an array of existing TLD names
  mapping (string => address) public tldAddressNames; // a mapping of TLDs (string => TLDaddress); if not address(0), it means the TLD has already been created
  
  string[] public forbidden; // forbidden TLDs (for example .eth, unstoppable domains, and TLDs that already exist in web2, like .com)
  
  uint public price; // price for creating a new TLD
  uint public royaltyPercentage; // payment percentage that Web3PandaDAO gets when a new domain is registered (injected in every newly created TLD contract)
  bool public buyingEnabled = false; // buying TLDs enabled (true/false)
  uint public nameMaxLength = 40; // the maximum length of a TLD name

  // EVENTS
  event TldCreated(address indexed user, string indexed tldName, address indexed tldAddress);

  // CONSTRUCTOR
  constructor(uint _price) {
    // forbidden TLDs
    forbidden.push(".eth");
    forbidden.push(".com");
    forbidden.push(".org");
    forbidden.push(".net");

    // set TLD price
    price = _price;
  }

  // READ

  // get the array of existing TLDs - is this needed?
  function getTldsArray() public view returns(string[] memory) {
    return tlds;
  }

  // get the array of forbidden TLDs
  function getForbiddenTldsArray() public view returns(string[] memory) {
    return forbidden;
  }

  // get TLD from array by index (this is probably auto-created because tlds array is public)

  // WRITE

  // create a new TLD (public payable)
  function createTld(
    string memory _name,
    string memory _symbol,
    address _tldOwner,
    uint _domainPrice,
    bool _buyingEnabled
  ) public payable returns(address) {
    require(buyingEnabled == true, "Buying TLDs is disabled");
    require(msg.value >= price, "Value below price");

    return _createTld(
      _name, 
      _symbol, 
      _tldOwner, 
      _domainPrice, 
      _buyingEnabled
    );

  }

  // create a new TLD (internal non-payable)
  function _createTld(
    string memory _name,
    string memory _symbol,
    address _tldOwner,
    uint _domainPrice,
    bool _buyingEnabled
  ) internal returns(address) {

    require(
      strings.len(strings.toSlice(_name)) > 1,
      "The TLD name must be longer than 1 character"
    );

    require(
      bytes(_name).length < nameMaxLength,
      "The TLD name is too long"
    );

    require(
      strings.count(strings.toSlice(_name), strings.toSlice(".")) == 1,
      "There should be exactly one dot in the name"
    );

    require(
      strings.startsWith(strings.toSlice(_name), strings.toSlice(".")) == true,
      "The dot must be at the start of the TLD name"
    );

    require(tldAddressNames[_name] == address(0), "TLD with this name already exists");

    // create a new TLD contract
    Web3PandaTLD tld = new Web3PandaTLD(
      _name, 
      _symbol, 
      _tldOwner, 
      _domainPrice, 
      _buyingEnabled,
      royaltyPercentage,
      address(this)
    );

    tldAddressNames[_name] = address(tld); // store TLD name and address into mapping
    tlds.push(_name); // store TLD name into array

    emit TldCreated(msg.sender, _name, address(tld));

    return address(tld);
  }

  // OWNER

  // create a new TLD for a specified address for free (only owner)
  function ownerCreateTld(
    string memory _name,
    string memory _symbol,
    address _tldOwner,
    uint _domainPrice,
    bool _buyingEnabled
  ) public onlyOwner returns(address) {

    return _createTld(
      _name, 
      _symbol, 
      _tldOwner, 
      _domainPrice, 
      _buyingEnabled
    );

  }

  // change the payment amount for a new TLD

  // enable/disable buying TLDs (except for the owner)
  function toggleBuyingTlds() public onlyOwner {
    buyingEnabled = !buyingEnabled;
  }

    // add a new TLD to forbidden TLDs

    // remove a TLD from forbidden TLDs
      // array[index] = array[array.length-1]; // replace TLD with the last one added
      // array.pop(); // delete the last one added
    
    // change nameMaxLength (max length of a TLD name)
}
