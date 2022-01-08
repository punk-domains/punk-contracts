// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "./lib/strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Web3PandaTLD.sol";

contract Web3PandaTLDFactory is Ownable {
  using strings for string;

  // STATE
  string[] public tlds; // an array of existing TLD names
  mapping (string => address) public tldNamesAddresses; // a mapping of TLDs (string => TLDaddress); if not address(0), it means the TLD has already been created
  
  string[] public forbidden; // forbidden TLDs (for example .eth, unstoppable domains, and TLDs that already exist in web2, like .com)
  
  uint public price; // price for creating a new TLD
  uint public royaltyPercentage; // payment percentage that Web3PandaDAO gets when a new domain is registered (injected in every newly created TLD contract)
  bool public buyingEnabled = false; // buying TLDs enabled (true/false)
  uint public nameMaxLength = 40; // the maximum length of a TLD name

  // EVENTS
  event TldCreated(address indexed user, string indexed tldName, address indexed tldAddress);

  // MODIFIERS
  modifier validTldName(string memory _name) {
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

    require(tldNamesAddresses[_name] == address(0), "TLD with this name already exists");
    
    _;
   }

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
  ) internal validTldName(_name) returns(address) {

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

    tldNamesAddresses[_name] = address(tld); // store TLD name and address into mapping
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
  function changePrice(uint _price) public onlyOwner {
    price = _price;
  }

  // enable/disable buying TLDs (except for the owner)
  function toggleBuyingTlds() public onlyOwner {
    buyingEnabled = !buyingEnabled;
  }

  // add a new TLD to forbidden TLDs
  function addForbiddenTld(string memory _name) public onlyOwner validTldName(_name) {
    forbidden.push(_name);
  }

  // remove a TLD from forbidden TLDs
  function removeForbiddenTld(uint _index) public onlyOwner {
    forbidden[_index] = forbidden[forbidden.length-1]; // replace TLD with the last one added
    forbidden.pop(); // delete the last item (so that it's not in array twice)
  }
  
  // change nameMaxLength (max length of a TLD name)
  function changeNameMaxLength(uint _maxLength) public onlyOwner {
    nameMaxLength = _maxLength;
  }
}
