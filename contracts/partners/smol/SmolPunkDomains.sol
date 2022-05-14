// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "./interfaces/IPunkTLD.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SmolPunkDomains is Ownable, ReentrancyGuard {
  address[] public supportedNfts; // whitelisted Smolverse NFT addresses
  bool public paused = true;

  uint256 public price; // domain price in $MAGIC
  uint256 public royaltyFee = 2_000; // share of each domain purchase (in bips) that goes to Punk Domains
  uint256 public referralFee = 0; // share of each domain purchase (in bips) that goes to the referrer
  uint256 public discountBps = 2_000; // discount for selected NFT collections (see discountEligible mapping)
  uint256 public constant MAX_BPS = 10_000;

  mapping (address => bool) public discountEligible; // NFT collections eligible for a discount

  // $MAGIC contract
  IERC20 public immutable magic;

  // TLD contract (.smol)
  IPunkTLD public immutable tldContract;

  // EVENTS
  event PriceChanged(address indexed user, uint256 price_);
  event ReferralChanged(address indexed user, uint256 referral_);
  event RoyaltyChanged(address indexed user, uint256 royalty_);

  // CONSTRUCTOR
  constructor(
    address _nftAddress, // the first whitelisted NFT address
    address _tldAddress,
    address _magicAddress,
    uint256 _price
  ) {
    supportedNfts.push(_nftAddress);
    tldContract = IPunkTLD(_tldAddress);
    magic = IERC20(_magicAddress);
    price = _price;
  }

  // READ

  /// @notice Returns true or false if address is eligible for a discount
  function canGetDiscount(address _user) public view returns(bool getDiscount) {
    IERC721 nftContract;
    for (uint256 i = 0; i < supportedNfts.length && !getDiscount; i++) {
      nftContract = IERC721(supportedNfts[i]);

      if (nftContract.balanceOf(_user) > 0) {
        getDiscount = discountEligible[supportedNfts[i]];
      }
    }

    return getDiscount;
  }

  /// @notice Returns true or false if address is eligible to mint a .smol domain
  function canUserMint(address _user) public view returns(bool canMint) {
    IERC721 nftContract;
    for (uint256 i = 0; i < supportedNfts.length && !canMint; i++) {
      nftContract = IERC721(supportedNfts[i]);

      if (nftContract.balanceOf(_user) > 0) {
        canMint = true;
      }
    }

    return canMint;
  }

  function getSupportedNftsArrayLength() public view returns(uint) {
    return supportedNfts.length;
  }

  function getSupportedNftsArray() public view returns(address[] memory) {
    return supportedNfts;
  }

  // WRITE

  /// @notice A $MAGIC approval transaction is needed to be made before minting
  function mint(
    string memory _domainName,
    address _domainHolder,
    address _referrer
  ) external nonReentrant returns(uint256) {
    require(!paused, "Minting paused");

    bool canMint = false;
    bool getDiscount = false;

    IERC721 nftContract;
    for (uint256 i = 0; i < supportedNfts.length && !getDiscount; i++) {
      nftContract = IERC721(supportedNfts[i]);

      if (nftContract.balanceOf(msg.sender) > 0) {
        canMint = true;
        getDiscount = discountEligible[supportedNfts[i]];
      }
    }

    require(canMint, "User cannot mint a domain");

    uint256 finalPrice = price;

    if (getDiscount) {
      finalPrice = price - ((price * discountBps) / MAX_BPS);
    }

    // send royalty fee
    uint256 royaltyPayment = (finalPrice * royaltyFee) / MAX_BPS;
    uint256 ownerPayment = finalPrice - royaltyPayment;
    magic.transferFrom(msg.sender, tldContract.getFactoryOwner(), royaltyPayment);

    // send referral fee
    if (referralFee > 0 && _referrer != address(0)) {
      uint256 referralPayment = (finalPrice * referralFee) / MAX_BPS;
      ownerPayment -= referralPayment;
      magic.transferFrom(msg.sender, _referrer, referralPayment);
    }

    // send the rest to the owner
    magic.transferFrom(msg.sender, owner(), ownerPayment);

    return tldContract.mint{value: 0}(_domainName, _domainHolder, address(0));
  }

  // OWNER

  /// @notice Owner can whitelist an NFT address
  function addWhitelistedNftContract(address _nftAddress) external onlyOwner {
    supportedNfts.push(_nftAddress);
  }

  /// @notice Change discount BPS (basis points, for example 10% is 1000 bps)
  function changeDiscountBps(uint256 _discountBps) external onlyOwner {
    discountBps = _discountBps;
  }

  /// @notice Change max domain name length in the TLD contract
  function changeMaxDomainNameLength(uint256 _maxLength) external onlyOwner {
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

  /// @notice Change NFT metadata description in the TLD contract
  function changeTldDescription(string calldata _description) external onlyOwner {
    tldContract.changeDescription(_description);
  }

  /// @notice Owner can mint a domain without holding/using an NFT
  function ownerMintDomain(
    string memory _domainName,
    address _domainHolder
  ) external nonReentrant onlyOwner returns(uint256) {
    return tldContract.mint{value: 0}(_domainName, _domainHolder, address(0));
  }

  /// @notice Recover any ERC-20 token mistakenly sent to this contract address
  function recoverERC20(address tokenAddress_, uint256 tokenAmount_, address recipient_) external onlyOwner {
    IERC20(tokenAddress_).transfer(recipient_, tokenAmount_);
  }

  /// @notice Recover any ERC-721 token mistakenly sent to this contract address
  function recoverERC721(address tokenAddress_, uint256 tokenId_, address recipient_) external onlyOwner {
    IERC721(tokenAddress_).transferFrom(address(this), recipient_, tokenId_);
  }

  /// @notice Owner can remove whitelisted NFT address
  function removeWhitelistedNftContract(uint _nftIndex) external onlyOwner {
    supportedNfts[_nftIndex] = supportedNfts[supportedNfts.length - 1];
    supportedNfts.pop();
  }

  /// @notice Transfer .smol TLD ownership to another address
  function transferTldOwnership(address _newTldOwner) external onlyOwner {
    tldContract.transferOwnership(_newTldOwner);
  }

  /// @notice Toggle discount eligibility for an NFT collection
  function toggleNftDiscount(address _nftAddress) external onlyOwner {
    discountEligible[_nftAddress] = !discountEligible[_nftAddress];
  }

  function togglePaused() external onlyOwner {
    paused = !paused;
  }

  // withdraw ETH from contract
  function withdraw() external onlyOwner {
    (bool success, ) = owner().call{value: address(this).balance}("");
    require(success, "Failed to withdraw ETH from contract");
  }

  // FACTORY OWNER

  /// @notice This changes royalty fee in the wrapper contract (cannot exceed 2000 bps or 20%)
  function changeRoyaltyFee(uint256 _royalty) external {
    require(_royalty <= 2000, "Cannot exceed 20%");
    require(msg.sender == tldContract.getFactoryOwner(), "Wrapper: Caller is not Factory owner");
    royaltyFee = _royalty;
    emit RoyaltyChanged(msg.sender, _royalty);
  }

  // RECEIVE & FALLBACK
  receive() external payable {}
  fallback() external payable {}
}
