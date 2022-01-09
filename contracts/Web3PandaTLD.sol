// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "./lib/strings.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Web3PandaTLD is ERC721, Ownable {
  using strings for string;

  // STATE
  uint256 public price; // price (how much a user needs to pay for a domain)
  bool public buyingEnabled; // buying domains enabled (true/false)
  address public factoryAddress; // Web3PandaTLDFactory address
  uint256 public royaltyPercentage; // percentage of each domain purchase that goes to Web3Panda DAO
  uint256 public totalSupply;
  uint256 public nameMaxLength = 140; // the maximum length of a domain name

  // domain data struct
  struct Domain {
    string name; // domain name that goes before the TLD name; example: "tempetechie" in "tempetechie.web3"
    uint256 tokenId; // domain token ID
    address holder; // domain holder address

    string description; // optional: description that domain holder can add
    string url; // optional: domain holder can specify a URL that his domain redirects to

    // optional: domain holder can set up a profile picture (an NFT that they hold)
    address pfpAddress;
    uint256 pfpTokenId;
  }
  
  mapping (string => Domain) public domains; // mapping (domain name => Domain struct)
  mapping (uint256 => string) public domainIdsNames; // mapping (tokenId => domain name)

  // EVENTS
  event DomainCreated(address indexed user, address indexed owner, string indexed fullDomainName);
  event PfpChanged(address indexed user, address indexed pfpAddress, uint256 pfpTokenId);
  event PfpValidated(address indexed user, address indexed owner, bool valid);

  // MODIFIERS
  modifier validName(string memory _name) {
    require(
      strings.len(strings.toSlice(_name)) > 1,
      "The domain name must be longer than 1 character"
    );

    require(
      bytes(_name).length < nameMaxLength,
      "The domain name is too long"
    );

    require(
      strings.count(strings.toSlice(_name), strings.toSlice(".")) == 0,
      "There should be no dots in the name"
    );

    require(domains[_name].holder == address(0), "Domain with this name already exists");
    
    _;
  }

  // CONSTRUCTOR
  constructor(
    string memory _name,
    string memory _symbol,
    address _tldOwner,
    uint256 _domainPrice,
    bool _buyingEnabled,
    uint256 _royalty,
    address _factoryAddress
  ) ERC721(_name, _symbol) {
    price = _domainPrice;
    buyingEnabled = _buyingEnabled;
    royaltyPercentage = _royalty;
    factoryAddress = _factoryAddress;

    transferOwnership(_tldOwner);
  }

  // READ

  // get domain holder's address
  // get domain holder's profile image (NFT address and token ID)

  // function tokenURI(uint256) public view override returns (string memory)

  // WRITE
  function editPfp(string memory _domainName, address _pfpAddress, uint256 _pfpTokenId) public {
    require(
      domains[_domainName].holder == msg.sender,
      "Only domain holder can edit their PFP"
    );

    ERC721 pfpContract = ERC721(_pfpAddress); // get PFP contract

    require(
      pfpContract.ownerOf(_pfpTokenId) == msg.sender,
      "Sender must be the owner of the specified PFP"
    );

    domains[_domainName].pfpAddress = _pfpAddress;
    domains[_domainName].pfpTokenId = _pfpTokenId;
    emit PfpChanged(msg.sender, _pfpAddress, _pfpTokenId);
  }

  // TODO: function editDescription
  // TODO: function editUrl

  // mint with mandatory params only
  function mint(
    string memory _domainName, 
    address _domainHolder
  ) public payable returns(uint256) {
    require(buyingEnabled == true, "Buying TLDs is disabled");
    require(msg.value >= price, "Value below price");

    return _mintDomain(_domainName, _domainHolder, "", "", address(0), 0);
  }

  // mint with both mandatory and optional params
  function mint(
    string memory _domainName, 
    address _domainHolder,
    string memory _description,
    string memory _url,
    address _pfpAddress,
    uint256 _pfpTokenId
  ) public payable returns(uint256) {
    require(buyingEnabled == true, "Buying TLDs is disabled");
    require(msg.value >= price, "Value below price");

    return _mintDomain(_domainName, _domainHolder, _description, _url, _pfpAddress, _pfpTokenId);
  }

  function _mintDomain(
    string memory _domainName, 
    address _domainHolder,
    string memory _description,
    string memory _url,
    address _pfpAddress,
    uint256 _pfpTokenId
  ) internal validName(_domainName) returns(uint256) {
    uint256 tokId = totalSupply;
    totalSupply++;

    _safeMint(_domainHolder, tokId);

    string memory fullDomainName = string(abi.encodePacked(_domainName, name()));

    Domain memory newDomain;

    newDomain.name = _domainName;
    newDomain.tokenId = tokId;
    newDomain.holder = _domainHolder;
    newDomain.description = _description;
    newDomain.url = _url;
    newDomain.pfpAddress = _pfpAddress;
    newDomain.pfpTokenId = _pfpTokenId;

    // add to both mappings
    domains[_domainName] = newDomain;
    domainIdsNames[tokId] = _domainName;
    
    emit DomainCreated(msg.sender, _domainHolder, fullDomainName);

    return tokId;
  }

  // check if holder of a domain (based on domain token ID) still owns their chosen pfp
  // anyone can do this validation for any user
  function validatePfp(uint256 _tokenId) public {
    address pfpAddress = domains[domainIdsNames[_tokenId]].pfpAddress;
    address holder = domains[domainIdsNames[_tokenId]].holder;

    if (pfpAddress != address(0)) {
      uint256 pfpTokenId = domains[domainIdsNames[_tokenId]].pfpTokenId;

      ERC721 pfpContract = ERC721(pfpAddress); // get PFP contract

      if (pfpContract.ownerOf(pfpTokenId) != holder) {
        // if user does not own that PFP, delete the PFP address from user's Domain struct 
        // (PFP token ID can be left alone to save on gas)
        domains[domainIdsNames[_tokenId]].pfpAddress = address(0);
        emit PfpValidated(msg.sender, holder, false);
      } else {
        emit PfpValidated(msg.sender, holder, true); // PFP image is valid
      }
    }
    
  }

  // HOOK

  /**
    * @dev Hook that is called before any token transfer. This includes minting
    * and burning.
    */
  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 tokenId
  ) internal override virtual {

    if (from != address(0)) { // this runs on every transfer but not on mint
      // change holder address in struct data (URL and description stay the same)
      domains[domainIdsNames[tokenId]].holder = to;
    }

    // check if new owner holds the NFT speicifed in Domain data
    address pfpAddress = domains[domainIdsNames[tokenId]].pfpAddress;

    if (pfpAddress != address(0)) {
      uint256 pfpTokenId = domains[domainIdsNames[tokenId]].pfpTokenId;

      ERC721 pfpContract = ERC721(pfpAddress); // get PFP contract

      if (pfpContract.ownerOf(pfpTokenId) != to) {
        // if user does not own that PFP, delete the PFP address from user's Domain struct 
        // (PFP token ID can be left alone to save on gas)
        domains[domainIdsNames[tokenId]].pfpAddress = address(0);
      }
    }
  }

  // OWNER

  // create a new domain for a specified address for free
  function ownerMintDomain(
    string memory _domainName, 
    address _domainHolder
  ) public onlyOwner returns(uint256) {
    return _mintDomain(_domainName, _domainHolder, "", "", address(0), 0);
  }

  // change the payment amount for a new domain
  function changePrice(uint256 _price) public onlyOwner {
    price = _price;
  }

  // enable/disable buying domains (except for the owner)
  function toggleBuyingDomains() public onlyOwner {
    buyingEnabled = !buyingEnabled;
  }
  
  // change nameMaxLength (max length of a TLD name)
  function changeNameMaxLength(uint256 _maxLength) public onlyOwner {
    nameMaxLength = _maxLength;
  }
  
  // FACTORY OWNER (current owner address of Web3PandaTLDFactory)

  // TODO function: change percentage of each domain purchase that goes to Web3Panda DAO
}
