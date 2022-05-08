// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "./interfaces/IPunkTLDFactory.sol";
import "../../lib/strings.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "base64-sol/base64.sol";

/// @title Punk Domains TLD contract (v2)
/// @author Tempe Techie
/// @notice Dynamically generated NFT contract which represents a top-level domain
contract PunkTLD is ERC721, Ownable, ReentrancyGuard {
  using strings for string;

  uint256 public price; // domain price
  bool public buyingEnabled; // buying domains enabled
  address public factoryAddress; // PunkTLDFactory address
  uint256 public royalty; // share of each domain purchase (in bips) that goes to Punk Domains
  uint256 public referral = 1000; // share of each domain purchase (in bips) that goes to the referrer (referral fee)
  uint256 public totalSupply;
  uint256 public nameMaxLength = 140; // max length of a domain name
  string public description = "Punk Domains digital identity. Visit https://punk.domains/";

  struct Domain {
    string name; // domain name that goes before the TLD name; example: "tempetechie" in "tempetechie.web3"
    uint256 tokenId;
    address holder;
    string data; // stringified JSON object, example: {"description": "Some text", "twitter": "@techie1239", "friends": ["0x123..."], "url": "https://punk.domains"}
  }
  
  mapping (string => Domain) public domains; // mapping (domain name => Domain struct)
  mapping (uint256 => string) public domainIdsNames; // mapping (tokenId => domain name)
  mapping (address => string) public defaultNames; // user's default domain

  event DomainCreated(address indexed user, address indexed owner, string fullDomainName);
  event DefaultDomainChanged(address indexed user, string defaultDomain);
  event DataChanged(address indexed user);
  event TldPriceChanged(address indexed user, uint256 tldPrice);
  event ReferralFeeChanged(address indexed user, uint256 referralFee);
  event TldRoyaltyChanged(address indexed user, uint256 tldRoyalty);
  event DomainBuyingToggle(address indexed user, bool domainBuyingToggle);

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
  function getDomainHolder(string calldata _domainName) public view returns(address) {
    return domains[strings.lower(_domainName)].holder;
  }

  function getDomainData(string calldata _domainName) public view returns(string memory) {
    return domains[strings.lower(_domainName)].data; // should be a JSON object
  }

  function getFactoryOwner() public view returns(address) {
    Ownable factory = Ownable(factoryAddress);
    return factory.owner();
  }

  function tokenURI(uint256 _tokenId) public view override returns (string memory) {
    IPunkTLDFactory factory = IPunkTLDFactory(factoryAddress);
    string memory fullDomainName = string(abi.encodePacked(domains[domainIdsNames[_tokenId]].name, name()));

    return string(
      abi.encodePacked("data:application/json;base64,",Base64.encode(bytes(abi.encodePacked(
        '{"name": "', fullDomainName, '", ',
        '"description": "', description, '", ',
        '"image": "', _getImage(fullDomainName, factory.projectName()), '"}'))))
    );
  }

  function _getImage(string memory _fullDomainName, string memory _projectName) internal pure returns (string memory) {
    string memory svgBase64Encoded = Base64.encode(bytes(string(abi.encodePacked(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:rgb(58,17,116);stop-opacity:1" /><stop offset="100%" style="stop-color:rgb(116,25,17);stop-opacity:1" /></linearGradient></defs><rect x="0" y="0" width="500" height="500" fill="url(#grad)"/><text x="50%" y="50%" dominant-baseline="middle" fill="white" text-anchor="middle" font-size="x-large">',
        _fullDomainName,'</text><text x="50%" y="70%" dominant-baseline="middle" fill="white" text-anchor="middle">',
        _projectName,'</text>',
      '</svg>'
    ))));

    return string(abi.encodePacked("data:image/svg+xml;base64,",svgBase64Encoded));
  }

  // WRITE
  function editDefaultDomain(string calldata _domainName) external {
    require(domains[_domainName].holder == msg.sender, "You do not own the selected domain");
    defaultNames[msg.sender] = _domainName;
    emit DefaultDomainChanged(msg.sender, _domainName);
  }

  /// @notice Edit domain custom data. Make sure to not accidentally delete previous data. Fetch previous data first.
  /// @param _domainName Only domain name, no TLD/extension.
  /// @param _data Custom data needs to be in a JSON object format.
  function editData(string calldata _domainName, string calldata _data) external {
    require(domains[_domainName].holder == msg.sender, "Only domain holder can edit their data");
    domains[_domainName].data = _data;
    emit DataChanged(msg.sender);
  }

  /// @notice Mint a new domain name as NFT (no dots and spaces allowed).
  /// @param _domainName Enter domain name without TLD and make sure letters are in lowercase form.
  /// @return token ID
  function mint(
    string memory _domainName,
    address _domainHolder,
    address _referrer
  ) external payable nonReentrant returns(uint256) {
    require(buyingEnabled || msg.sender == owner(), "Buying TLDs disabled");
    require(msg.value >= price, "Value below price");

    _sendPayment(msg.value, _referrer);

    return _mintDomain(_domainName, _domainHolder, "");
  }

  function _mintDomain(
    string memory _domainNameRaw, 
    address _domainHolder,
    string memory _data
  ) internal returns(uint256) {
    // convert domain name to lowercase (only works for ascii, clients should enforce ascii domains only)
    string memory _domainName = strings.lower(_domainNameRaw);

    require(strings.len(strings.toSlice(_domainName)) > 1, "Domain must be longer than 1 char");
    require(bytes(_domainName).length < nameMaxLength, "Domain name is too long");
    require(strings.count(strings.toSlice(_domainName), strings.toSlice(".")) == 0, "There should be no dots in the name");
    require(strings.count(strings.toSlice(_domainName), strings.toSlice(" ")) == 0, "There should be no spaces in the name");
    require(domains[_domainName].holder == address(0), "Domain with this name already exists");

    _safeMint(_domainHolder, totalSupply);

    Domain memory newDomain;
    
    // store data in Domain struct
    newDomain.name = _domainName;
    newDomain.tokenId = totalSupply;
    newDomain.holder = _domainHolder;
    newDomain.data = _data;

    // add to both mappings
    domains[_domainName] = newDomain;
    domainIdsNames[totalSupply] = _domainName;

    if (bytes(defaultNames[_domainHolder]).length == 0) {
      defaultNames[_domainHolder] = _domainName; // if default domain name is not set for that holder, set it now
    }
    
    emit DomainCreated(msg.sender, _domainHolder, string(abi.encodePacked(_domainName, name())));

    ++totalSupply;

    return totalSupply-1;
  }

  function _sendPayment(uint256 _paymentAmount, address _referrer) internal {
    if (royalty > 0 && royalty < 5000) { 
      // send royalty - must be less than 50% (5000 bips)
      (bool sentRoyalty, ) = payable(getFactoryOwner()).call{value: ((_paymentAmount * royalty) / 10000)}("");
      require(sentRoyalty, "Failed to send royalty to factory owner");
    }

    if (_referrer != address(0) && referral > 0 && referral < 5000) {
      // send referral fee - must be less than 50% (5000 bips)
      (bool sentReferralFee, ) = payable(_referrer).call{value: ((_paymentAmount * referral) / 10000)}("");
      require(sentReferralFee, "Failed to send referral fee");
    }

    // send the rest to TLD owner
    (bool sent, ) = payable(owner()).call{value: address(this).balance}("");
    require(sent, "Failed to send domain payment to TLD owner");
  }

  ///@dev Hook that is called before any token transfer. This includes minting and burning.
  function _beforeTokenTransfer(address from,address to,uint256 tokenId) internal override virtual {

    if (from != address(0)) { // run on every transfer but not on mint
      domains[domainIdsNames[tokenId]].holder = to; // change holder address in Domain struct
      domains[domainIdsNames[tokenId]].data = ""; // reset custom data
      
      if (bytes(defaultNames[to]).length == 0) {
        defaultNames[to] = domains[domainIdsNames[tokenId]].name; // if default domain name is not set for that holder, set it now
      }

      if (strings.equals(strings.toSlice(domains[domainIdsNames[tokenId]].name), strings.toSlice(defaultNames[from]))) {
        defaultNames[from] = ""; // if previous owner had this domain name as default, unset it as default
      }
    }
  }

  // OWNER

  /// @notice Only TLD contract owner can call this function.
  function changeDescription(string calldata _description) external onlyOwner {
    description = _description;
  }

  /// @notice Only TLD contract owner can call this function.
  function changeNameMaxLength(uint256 _maxLength) external onlyOwner {
    nameMaxLength = _maxLength;
  }

  /// @notice Only TLD contract owner can call this function.
  function changePrice(uint256 _price) external onlyOwner {
    price = _price;
    emit TldPriceChanged(msg.sender, _price);
  }

  /// @notice Only TLD contract owner can call this function.
  function changeReferralFee(uint256 _referral) external onlyOwner {
    require(_referral < 5000, "Referral fee cannot be 50% or higher");
    referral = _referral; // referral must be in bips
    emit ReferralFeeChanged(msg.sender, _referral);
  }

  /// @notice Only TLD contract owner can call this function.
  function toggleBuyingDomains() external onlyOwner {
    buyingEnabled = !buyingEnabled;
    emit DomainBuyingToggle(msg.sender, buyingEnabled);
  }
  
  // FACTORY OWNER (current owner address of PunkTLDFactory)

  /// @notice Only Factory contract owner can call this function.
  function changeRoyalty(uint256 _royalty) external {
    require(getFactoryOwner() == msg.sender, "Sender not factory owner");
    require(_royalty < 5000, "Royalty cannot be 50% or higher");
    royalty = _royalty; // royalty is in bips
    emit TldRoyaltyChanged(msg.sender, _royalty);
  }
}
