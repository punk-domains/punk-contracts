// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "../../lib/strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./PunkTLD.sol";
import "../../interfaces/IPunkForbiddenTlds.sol";

/// @title Punk Domains TLD Factory contract (v2)
/// @author Tempe Techie
/// @notice Factory contract dynamically generates new TLD contracts.
contract PunkTLDFactory is Ownable, ReentrancyGuard {
  using strings for string;

  string public projectName = "punk.domains";

  string[] public tlds; // existing TLDs
  mapping (string => address) public tldNamesAddresses; // a mapping of TLDs (string => TLDaddress)

  address public forbiddenTlds; // address of the contract that stores the list of forbidden TLDs
  
  uint256 public price; // price for creating a new TLD
  uint256 public royalty = 0; // royalty for Punk Domains when new domain is minted 
  bool public buyingEnabled = false; // buying TLDs enabled (true/false)
  uint256 public nameMaxLength = 40; // the maximum length of a TLD name

  event TldCreated(address indexed user, address indexed owner, string tldName, address tldAddress);
  event ChangeTldPrice(address indexed user, uint256 tldPrice);

  constructor(uint256 _price, address _forbiddenTlds) {
    price = _price;
    forbiddenTlds = _forbiddenTlds;
  }

  // READ
  function getTldsArray() public view returns(string[] memory) {
    return tlds;
  }

  function _validTldName(string memory _name) view internal {
    // ex-modifier turned into internal function to optimize contract size
    require(strings.len(strings.toSlice(_name)) > 1, "TLD too short");
    require(bytes(_name).length < nameMaxLength, "TLD too long");
    require(strings.count(strings.toSlice(_name), strings.toSlice(".")) == 1, "Name must have 1 dot");
    require(strings.count(strings.toSlice(_name), strings.toSlice(" ")) == 0, "Name must have no spaces");
    require(strings.startsWith(strings.toSlice(_name), strings.toSlice(".")) == true, "Name must start with dot");

    IPunkForbiddenTlds forbidden = IPunkForbiddenTlds(forbiddenTlds);
    require(forbidden.isTldForbidden(_name) == false, "TLD already exists or forbidden");
  }

  // WRITE

  /// @notice Create a new top-level domain contract (ERC-721).
  /// @param _name Enter TLD name starting with a dot and make sure letters are in lowercase form.
  /// @return TLD contract address
  function createTld(
    string memory _name,
    string memory _symbol,
    address _tldOwner,
    uint256 _domainPrice,
    bool _buyingEnabled
  ) external payable nonReentrant returns(address) {
    require(buyingEnabled == true, "Buying TLDs disabled");
    require(msg.value >= price, "Value below price");

    (bool sent, ) = payable(owner()).call{value: address(this).balance}("");
    require(sent, "Failed to send TLD payment to factory owner");

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
    string memory _nameRaw,
    string memory _symbol,
    address _tldOwner,
    uint256 _domainPrice,
    bool _buyingEnabled
  ) internal returns(address) {
    string memory _name = strings.lower(_nameRaw);

    _validTldName(_name);

    PunkTLD tld = new PunkTLD(
      _name, 
      _symbol, 
      _tldOwner, 
      _domainPrice, 
      _buyingEnabled,
      royalty,
      address(this)
    );

    IPunkForbiddenTlds forbidden = IPunkForbiddenTlds(forbiddenTlds);
    forbidden.addForbiddenTld(_name);

    tldNamesAddresses[_name] = address(tld); // store TLD name and address into mapping
    tlds.push(_name); // store TLD name into array

    emit TldCreated(msg.sender, _tldOwner, _name, address(tld));

    return address(tld);
  }

  // OWNER

  /// @notice Only Factory contract owner can call this function.
  function changeForbiddenTldsAddress(address _forbiddenTlds) external onlyOwner {
    forbiddenTlds = _forbiddenTlds;
  }

  /// @notice Only Factory contract owner can call this function.
  function changeNameMaxLength(uint256 _maxLength) external onlyOwner {
    nameMaxLength = _maxLength;
  }

  /// @notice Only Factory contract owner can call this function.
  function changePrice(uint256 _price) external onlyOwner {
    price = _price;
    emit ChangeTldPrice(msg.sender, _price);
  }

  /// @notice Only Factory contract owner can call this function.
  function changeProjectName(string calldata _newProjectName) external onlyOwner {
    // visible in each domain NFT image (SVG)
    projectName = _newProjectName;
  }
  
  /// @notice Only Factory contract owner can call this function.
  function changeRoyalty(uint256 _royalty) external onlyOwner {
    require(_royalty < 5000, "Royalty cannot be 50% or higher");
    royalty = _royalty;
  }

  /// @notice Factory owner can create a new TLD for a specified address for free
  /// @param _name Enter TLD name starting with a dot and make sure letters are in lowercase form.
  /// @return TLD contract address
  function ownerCreateTld(
    string memory _name,
    string memory _symbol,
    address _tldOwner,
    uint256 _domainPrice,
    bool _buyingEnabled
  ) external onlyOwner returns(address) {

    return _createTld(
      _name, 
      _symbol, 
      _tldOwner, 
      _domainPrice, 
      _buyingEnabled
    );

  }

  /// @notice Only Factory contract owner can call this function.
  function toggleBuyingTlds() external onlyOwner {
    buyingEnabled = !buyingEnabled;
  }

}
