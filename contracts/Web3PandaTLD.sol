// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "./interfaces/IWeb3PandaTLDFactory.sol";
import "./lib/strings.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "base64-sol/base64.sol";

contract Web3PandaTLD is ERC721, Ownable {
  using strings for string;

  uint256 public price; // domain price
  bool public buyingEnabled; // buying domains enabled
  address public factoryAddress; // Web3PandaTLDFactory address
  uint256 public royalty; // share of each domain purchase (in bips) that goes to Web3Panda DAO
  uint256 public totalSupply;
  uint256 public nameMaxLength = 140; // max length of a domain name

  struct Domain {
    string name; // domain name that goes before the TLD name; example: "tempetechie" in "tempetechie.web3"
    uint256 tokenId;
    address holder;
    string data; // stringified JSON object, example: {"description": "Some text", "twitter": "@techie1239", "friends": ["0x123..."]}
    string url; // optional: domain holder can specify a URL that his domain redirects to
    // optional: domain holder can set up a profile picture (an NFT that they hold)
    address pfpAddress;
    uint256 pfpTokenId;
  }
  
  mapping (string => Domain) public domains; // mapping (domain name => Domain struct)
  mapping (uint256 => string) public domainIdsNames; // mapping (tokenId => domain name)
  mapping (address => string) public defaultNames; // user's default domain

  event DomainCreated(address indexed user, address indexed owner, string indexed fullDomainName);
  event DefaultDomainChanged(address indexed user, string defaultDomain);
  event DataChanged(address indexed user);
  event UrlChanged(address indexed user, string url);
  event PfpChanged(address indexed user, address indexed pfpAddress, uint256 pfpTokenId);
  event PfpValidated(address indexed user, address indexed owner, bool valid);

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
    royalty = _royalty;
    factoryAddress = _factoryAddress;

    transferOwnership(_tldOwner);
  }

  // READ

  // Domain getters - you can also get all Domain data by calling the auto-generated domains(domainName) method
  function getDomainHolder(string memory _domainName) public view returns(address) {
    return domains[_domainName].holder;
  }

  function getDomainPfpAddress(string memory _domainName) public view returns(address) {
    ERC721 pfpContract = ERC721(domains[_domainName].pfpAddress); // get PFP contract

    // if domain holder really owns that NFT, return the NFT address
    if (pfpContract.ownerOf(domains[_domainName].pfpTokenId) == domains[_domainName].holder) {
      return domains[_domainName].pfpAddress;
    } else {
      // otherwise return 0x0 address
      return address(0);
    }
  }

  function getDomainPfpTokenId(string memory _domainName) public view returns(uint256) {
    return domains[_domainName].pfpTokenId;
  }

  function getDomainData(string memory _domainName) public view returns(string memory) {
    return domains[_domainName].data; // should be a JSON object
  }

  function getDomainUrl(string memory _domainName) public view returns(string memory) {
    return domains[_domainName].url;
  }

  function getFactoryOwner() public view returns(address) {
    Ownable factory = Ownable(factoryAddress);
    return factory.owner();
  }

  function tokenURI(uint256 _tokenId) public view override returns (string memory) {
    string memory fullDomainName = string(abi.encodePacked(domains[domainIdsNames[_tokenId]].name, name()));

    return string(
      abi.encodePacked("data:application/json;base64,",Base64.encode(bytes(abi.encodePacked(
        '{"name":"', fullDomainName, '", ',
        '"description": "Web3Panda digital identity (web3panda.org, panda.web3).", ',
        '"image": "', _getImage(fullDomainName), '"}'))))
    );
  }

  function _getImage(string memory _fullDomainName) internal view returns (string memory) {
    string memory baseURL = "data:image/svg+xml;base64,";
    IWeb3PandaTLDFactory factory = IWeb3PandaTLDFactory(factoryAddress);

    string memory svgBase64Encoded = Base64.encode(bytes(string(abi.encodePacked(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500"><text style="white-space: pre; fill: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 41.1px;" x="138.221" y="263.804">',
        _fullDomainName,'</text><text style="white-space: pre; fill: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 25.6px;" x="162.163" y="441.07">',
        factory.projectName(),'</text>',
      '</svg>'
    ))));

    return string(abi.encodePacked(baseURL,svgBase64Encoded));
  }

  // WRITE
  function editDefaultDomain(string memory _domainName) public {
    require(domains[_domainName].holder == msg.sender,"You do not own the selected domain");
    defaultNames[msg.sender] = _domainName;
    emit DefaultDomainChanged(msg.sender, _domainName);
  }

  function editData(string memory _domainName, string memory _data) external {
    require(domains[_domainName].holder == msg.sender,"Only domain holder can edit their data");
    domains[_domainName].data = _data;
    emit DataChanged(msg.sender);
  }

  function editPfp(string memory _domainName, address _pfpAddress, uint256 _pfpTokenId) public {
    require(domains[_domainName].holder == msg.sender,"Only domain holder can edit their PFP");

    ERC721 pfpContract = ERC721(_pfpAddress); // get PFP contract

    require(pfpContract.ownerOf(_pfpTokenId) == msg.sender,"Sender not PFP owner");

    domains[_domainName].pfpAddress = _pfpAddress;
    domains[_domainName].pfpTokenId = _pfpTokenId;
    emit PfpChanged(msg.sender, _pfpAddress, _pfpTokenId);
  }

  function editUrl(string memory _domainName, string memory _url) external {
    require(domains[_domainName].holder == msg.sender,"Not domain holder");
    domains[_domainName].url = _url;
    emit UrlChanged(msg.sender, _url);
  }

  // mint with mandatory params only
  function mint(
    string memory _domainName, 
    address _domainHolder
  ) public payable returns(uint256) {
    require(buyingEnabled == true, "Buying TLDs disabled");
    require(msg.value >= price, "Value below price");

    _sendPayment(msg.value);

    return _mintDomain(_domainName, _domainHolder, "", "", address(0), 0);
  }

  // mint with both mandatory and optional params
  function mint(
    string memory _domainName,
    address _domainHolder,
    string memory _data,
    string memory _url,
    address _pfpAddress,
    uint256 _pfpTokenId
  ) public payable returns(uint256) {
    require(buyingEnabled == true, "Buying TLDs disabled");
    require(msg.value >= price, "Value below price");

    _sendPayment(msg.value);

    return _mintDomain(_domainName, _domainHolder, _data, _url, _pfpAddress, _pfpTokenId);
  }

  function _mintDomain(
    string memory _domainName, 
    address _domainHolder,
    string memory _data,
    string memory _url,
    address _pfpAddress,
    uint256 _pfpTokenId
  ) internal returns(uint256) {
    require(strings.len(strings.toSlice(_domainName)) > 1,"Domain must be longer than 1 char");
    require(bytes(_domainName).length < nameMaxLength,"Domain name is too long");
    require(strings.count(strings.toSlice(_domainName), strings.toSlice(".")) == 0,"There should be no dots in the name");
    require(domains[_domainName].holder == address(0), "Domain with this name already exists");

    _safeMint(_domainHolder, totalSupply);

    Domain memory newDomain;

    // validate if domain holder really owns the specified PFP
    if (_pfpAddress != address(0)) {
      ERC721 pfpContract = ERC721(_pfpAddress);
      require(pfpContract.ownerOf(_pfpTokenId) == _domainHolder,"Domain holder not owner of the PFP");

      // store PFP data in Domain struct
      newDomain.pfpAddress = _pfpAddress;
      newDomain.pfpTokenId = _pfpTokenId;
    }
    
    // store data in Domain struct
    newDomain.name = _domainName;
    newDomain.tokenId = totalSupply;
    newDomain.holder = _domainHolder;
    newDomain.data = _data;
    newDomain.url = _url;

    // add to both mappings
    domains[_domainName] = newDomain;
    domainIdsNames[totalSupply] = _domainName;

    if (bytes(defaultNames[_domainHolder]).length == 0) {
      defaultNames[_domainHolder] = _domainName; // if default domain name is not set for that holder, set it now
    }
    
    emit DomainCreated(msg.sender, _domainHolder, string(abi.encodePacked(_domainName, name())));

    totalSupply++;
    return totalSupply-1;
  }

  function _sendPayment(uint256 _paymentAmount) internal {
    if (royalty > 0) {
      payable(getFactoryOwner()).transfer((_paymentAmount * royalty) / 10000); // royalty for factory owner
    }
    
    payable(owner()).transfer(address(this).balance); // send the rest to TLD owner
  }

  // check if holder of a domain (based on domain token ID) still owns their chosen pfp (anyone can do this validation for any user)
  function validatePfp(uint256 _tokenId) public {
    if (domains[domainIdsNames[_tokenId]].pfpAddress != address(0)) {
      ERC721 pfpContract = ERC721(domains[domainIdsNames[_tokenId]].pfpAddress);

      if (pfpContract.ownerOf(domains[domainIdsNames[_tokenId]].pfpTokenId) != domains[domainIdsNames[_tokenId]].holder) {
        // if user does not own that PFP, delete the PFP address from user's Domain struct
        domains[domainIdsNames[_tokenId]].pfpAddress = address(0);
        emit PfpValidated(msg.sender, domains[domainIdsNames[_tokenId]].holder, false);
      } else {
        emit PfpValidated(msg.sender, domains[domainIdsNames[_tokenId]].holder, true); // PFP image is valid
      }
    }
    
  }

  //@dev Hook that is called before any token transfer. This includes minting and burning.
  function _beforeTokenTransfer(address from,address to,uint256 tokenId) internal override virtual {

    if (from != address(0)) { // run on every transfer but not on mint
      domains[domainIdsNames[tokenId]].holder = to; // change holder address in struct data
      domains[domainIdsNames[tokenId]].data = ""; // reset data
      
      if (bytes(defaultNames[to]).length == 0) {
        defaultNames[to] = domains[domainIdsNames[tokenId]].name; // if default domain name is not set for that holder, set it now
      }

      if (strings.equals(strings.toSlice(domains[domainIdsNames[tokenId]].name), strings.toSlice(defaultNames[from]))) {
        defaultNames[from] = ""; // if previous owner had this domain name as default, unset it as default
      }

      // validate if new owner holds the NFT speicifed in Domain data
      if (domains[domainIdsNames[tokenId]].pfpAddress != address(0)) {
        ERC721 pfpContract = ERC721(domains[domainIdsNames[tokenId]].pfpAddress);

        if (pfpContract.ownerOf(domains[domainIdsNames[tokenId]].pfpTokenId) != to) {
          domains[domainIdsNames[tokenId]].pfpAddress = address(0); // if user does not own that PFP, delete the PFP address from user's Domain struct
        }
      }
    }
  }

  // OWNER
  function ownerMintDomain(string memory _domainName, address _domainHolder) public onlyOwner returns(uint256) {
    return _mintDomain(_domainName, _domainHolder, "", "", address(0), 0);
  }

  function changePrice(uint256 _price) public onlyOwner {
    price = _price;
  }

  function toggleBuyingDomains() public onlyOwner {
    buyingEnabled = !buyingEnabled;
  }
  
  function changeNameMaxLength(uint256 _maxLength) public onlyOwner {
    nameMaxLength = _maxLength;
  }
  
  // FACTORY OWNER (current owner address of Web3PandaTLDFactory)
  function changeRoyalty(uint256 _royalty) public {
    require(getFactoryOwner() == msg.sender,"Sender not factory owner");
    royalty = _royalty; // royalty is in bips
  }
}
