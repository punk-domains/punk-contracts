// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "./lib/strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Web3PandaTLD.sol";

contract Web3PandaTLDFactory is Ownable {
  using strings for string;

  string public projectName = "web3panda.org";

  string[] public tlds; // existing TLDs
  mapping (string => address) public tldNamesAddresses; // a mapping of TLDs (string => TLDaddress)
  mapping (string => bool) public forbidden; // forbidden TLDs
  
  uint256 public price; // price for creating a new TLD
  uint256 public royalty = 0; // royalty for Web3PandaDAO when new domain is minted 
  bool public buyingEnabled = false; // buying TLDs enabled (true/false)
  uint256 public nameMaxLength = 40; // the maximum length of a TLD name

  event TldCreated(address indexed user, address indexed owner, string indexed tldName, address tldAddress);

  constructor(uint256 _price) {
    forbidden[".eth"] = true;
    forbidden[".com"] = true;
    forbidden[".org"] = true;
    forbidden[".net"] = true;
    price = _price;
  }

  // READ
  function getTldsArray() public view returns(string[] memory) {
    return tlds;
  }

  function _validTldName(string memory _name) view internal {
    // ex-modifier turned into internal function to optimize contract size
    require(strings.len(strings.toSlice(_name)) > 1,"TLD too short");
    require(bytes(_name).length < nameMaxLength,"TLD too long");
    require(strings.count(strings.toSlice(_name), strings.toSlice(".")) == 1,"Name must have 1 dot");
    require(strings.startsWith(strings.toSlice(_name), strings.toSlice(".")) == true,"Name must start with dot");
    require(forbidden[_name] == false, "Forbidden TLD");
    require(tldNamesAddresses[_name] == address(0), "TLD already exists");
  }

  // WRITE

  // create a new TLD (public payable)
  function createTld(
    string memory _name,
    string memory _symbol,
    address _tldOwner,
    uint256 _domainPrice,
    bool _buyingEnabled
  ) public payable returns(address) {
    require(buyingEnabled == true, "Buying TLDs disabled");
    require(msg.value >= price, "Value below price");

    payable(owner()).transfer(address(this).balance);

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
    uint256 _domainPrice,
    bool _buyingEnabled
  ) internal returns(address) {
    _validTldName(_name);

    Web3PandaTLD tld = new Web3PandaTLD(
      _name, 
      _symbol, 
      _tldOwner, 
      _domainPrice, 
      _buyingEnabled,
      royalty,
      address(this)
    );

    tldNamesAddresses[_name] = address(tld); // store TLD name and address into mapping
    tlds.push(_name); // store TLD name into array

    emit TldCreated(msg.sender, _tldOwner, _name, address(tld));

    return address(tld);
  }

  // OWNER
  function addForbiddenTld(string memory _name) public onlyOwner {
    _validTldName(_name);
    forbidden[_name] = true;
  }

  function changeNameMaxLength(uint256 _maxLength) public onlyOwner {
    nameMaxLength = _maxLength;
  }

  function changePrice(uint256 _price) public onlyOwner {
    price = _price;
  }

  function changeProjectName(string memory _newProjectName) public onlyOwner {
    projectName = _newProjectName;
  }
  
  function changeRoyalty(uint256 _royalty) public onlyOwner {
    royalty = _royalty;
  }

  // create a new TLD for a specified address for free (only owner)
  function ownerCreateTld(
    string memory _name,
    string memory _symbol,
    address _tldOwner,
    uint256 _domainPrice,
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

  function removeForbiddenTld(string memory _name) public onlyOwner {
    forbidden[_name] = false;
  }

  function toggleBuyingTlds() public onlyOwner {
    buyingEnabled = !buyingEnabled;
  }

}
