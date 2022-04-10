// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "../../interfaces/IPunkTLD.sol";
import "./interfaces/IKNS_Retirer.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract KlimaPunkDomains is Ownable, ReentrancyGuard {
  string public constant TLD_NAME = ".klima";
  bool public paused = true;

  address public knsRetirerAddress;

  uint256 public price; // domain price in USDC (6 decimals!!!)
  uint256 public royaltyFee = 2_000; // share of each domain purchase (in bips) that goes to Punk Domains
  uint256 public referralFee = 1_000; // share of each domain purchase (in bips) that goes to the referrer
  uint256 public constant MAX_BPS = 10_000;

  mapping (address => bool) public whitelisted; // addresses whitelisted for a free mint

  // USDC contract
  IERC20 public immutable usdc;

  // TLD contract
  IPunkTLD public immutable tldContract;

  // EVENTS

  event RetirerAddressChanged(address indexed user, address oldAddress, address newAddress);
  event PriceChanged(address indexed user, uint256 price_);
  event ReferralChanged(address indexed user, uint256 referral_);
  event RoyaltyChanged(address indexed user, uint256 royalty_);
  event AddedToWhitelist(address indexed user, address addr);
  event RemovedFromWhitelist(address indexed user, address addr);

  // CONSTRUCTOR
  constructor(
    address _knsRetirerAddress,
    address _tldAddress,
    address _usdcAddress,
    uint256 _price
  ) {
    tldContract = IPunkTLD(_tldAddress);
    usdc = IERC20(_usdcAddress);
    knsRetirerAddress = _knsRetirerAddress;
    price = _price;
  }

  /// @notice A USDC approval transaction needs to be made before minting
  function mint(
    string memory _domainName,
    address _domainHolder,
    address _referrer,
    string memory _retireMessage
  ) external nonReentrant returns(uint256) {
    require(!paused || msg.sender == owner(), "Minting paused");

    // if msg.sender is whitelisted for a free mint, allow it (and set free mint back to false)
    if (whitelisted[msg.sender]) {
      // free minting
      whitelisted[msg.sender] = false;
    } else {
      // paid minting (distribute the payment)

      // send royalty fee
      uint256 royaltyPayment = (price * royaltyFee) / MAX_BPS;
      uint256 gwamiPayment = price - royaltyPayment;
      usdc.transferFrom(msg.sender, tldContract.getFactoryOwner(), royaltyPayment);

      // send referral fee
      if (referralFee > 0 && _referrer != address(0)) {
        uint256 referralPayment = (price * referralFee) / MAX_BPS;
        gwamiPayment -= referralPayment;
        usdc.transferFrom(msg.sender, _referrer, referralPayment);
      }

      // give USDC spending approval to the KNS retirer contract and call it
      usdc.transferFrom(msg.sender, address(this), gwamiPayment); // transfer funds from user to this contract
      usdc.approve(knsRetirerAddress, gwamiPayment); // this contract gives spending approval to KNS Retirer contract
      
      IKNS_Retirer retirer = IKNS_Retirer(knsRetirerAddress);
      retirer.retireAndKI( // call the retire function
        gwamiPayment, 
        _domainHolder, 
        string(bytes.concat(bytes(_domainName), bytes(TLD_NAME))), // join together domain name and TLD name
        _retireMessage
      );
    }

    return tldContract.mint{value: 0}(_domainName, _domainHolder, address(0));
  }

  // OWNER

  function addAddressToWhitelist(address _addr) external onlyOwner {
    whitelisted[_addr] = true;
    emit AddedToWhitelist(msg.sender, _addr);
  }

  function removeAddressFromWhitelist(address _addr) external onlyOwner {
    whitelisted[_addr] = false;
    emit RemovedFromWhitelist(msg.sender, _addr);
  }

  function changeKnsRetirerAddress(address _newKnsRetirerAddr) external onlyOwner {
    emit RetirerAddressChanged(msg.sender, knsRetirerAddress, _newKnsRetirerAddr);
    knsRetirerAddress = _newKnsRetirerAddr;
  }

  function changeMaxDomainNameLength(uint256 _maxLength) external onlyOwner {
    require(_maxLength > 0, "Cannot be zero");
    tldContract.changeNameMaxLength(_maxLength);
  }

  /// @notice This changes price in the wrapper contract
  function changePrice(uint256 _price) external onlyOwner {
    require(_price > 0, "Cannot be zero");
    price = _price;
    emit PriceChanged(msg.sender, _price);
  }

  /// @notice This changes referral fee in the wrapper contract
  function changeReferralFee(uint256 _referral) external onlyOwner {
    require(_referral <= 2000, "Cannot exceed 20%");
    referralFee = _referral;
    emit ReferralChanged(msg.sender, _referral);
  }

  /// @notice This changes description in the .klima TLD contract
  function changeTldDescription(string calldata _description) external onlyOwner {
    tldContract.changeDescription(_description);
  }

  /// @notice Recover any ERC-20 tokens that were mistakenly sent to the contract
  function recoverERC20(address tokenAddress_, uint256 tokenAmount_, address recipient_) external onlyOwner {
    IERC20(tokenAddress_).transfer(recipient_, tokenAmount_);
  }

  /// @notice Recover any ERC-721 tokens that were mistakenly sent to the contract
  function recoverERC721(address tokenAddress_, uint256 tokenId_, address recipient_) external onlyOwner {
    IERC721(tokenAddress_).transferFrom(address(this), recipient_, tokenId_);
  }

  /// @notice Transfer .klima TLD ownership to another address
  function transferTldOwnership(address _newTldOwner) external onlyOwner {
    tldContract.transferOwnership(_newTldOwner);
  }

  function togglePaused() external onlyOwner {
    paused = !paused;
  }

  /// @notice Withdraw MATIC from the contract
  function withdraw() external onlyOwner {
    (bool success, ) = owner().call{value: address(this).balance}("");
    require(success, "Klima Wrapper: Failed to withdraw MATIC from contract");
  }

  // FACTORY OWNER

  /// @notice This changes royalty fee in the wrapper contract
  function changeRoyaltyFee(uint256 _royalty) external {
    require(msg.sender == tldContract.getFactoryOwner(), "Klima Wrapper: Caller is not Factory owner");
    royaltyFee = _royalty;
    emit RoyaltyChanged(msg.sender, _royalty);
  }

  // RECEIVE & FALLBACK
  receive() external payable {}
  fallback() external payable {}
}