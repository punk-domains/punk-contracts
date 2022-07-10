// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IFlexiPunkTLD.sol";
import "./interfaces/IPunkAngelMetadata.sol";
import "../../lib/strings.sol";

contract PunkAngelMinter is Ownable, ReentrancyGuard {
  bool public paused = true;
  uint256 public referralFee = 1_000; // share of each domain purchase (in bips) that goes to the referrer
  uint256 public constant MAX_BPS = 10_000;

  uint256 public maxTotalPayments;
  uint256 public totalPayments; // total amount of payments in the payment token

  uint256 public price1char; // 1 char domain price
  uint256 public price2char; // 2 chars domain price
  uint256 public price3char; // 3 chars domain price
  uint256 public price4char; // 4 chars domain price
  uint256 public price5char; // 5+ chars domain price

  // TLD contract (.punkangel)
  IERC20 public immutable paymentToken; // payment token
  IFlexiPunkTLD public immutable tldContract; // TLD contract
  IPunkAngelMetadata public metadataContract; // metadata contract

  // EVENTS
  event FeatureMinted(string indexed featureId_);

  // CONSTRUCTOR
  constructor(
    address _tokenAddress,
    address _tldAddress,
    address _metadataAddress,
    uint256 _maxTotalPayments,
    uint256 _price1char,
    uint256 _price2char,
    uint256 _price3char,
    uint256 _price4char,
    uint256 _price5char
  ) {
    paymentToken = IERC20(_tokenAddress);
    tldContract = IFlexiPunkTLD(_tldAddress);
    metadataContract = IPunkAngelMetadata(_metadataAddress);
    maxTotalPayments = _maxTotalPayments;
    price1char = _price1char;
    price2char = _price2char;
    price3char = _price3char;
    price4char = _price4char;
    price5char = _price5char;
  }

  // WRITE

  /// @notice payment token approval transaction needs to be made before minting
  function mint(
    string memory _domainName,
    address _domainHolder,
    address _referrer,
    string[] calldata _featureIds
  ) external nonReentrant returns(uint256 tokenId) {
    require(!paused || _msgSender() == owner(), "Minting paused");
    require(totalPayments < maxTotalPayments, "Max total payments reached");

    // find price
    uint256 domainLength = strings.len(strings.toSlice(_domainName));
    uint256 selectedPrice;

    if (domainLength == 1) {
      selectedPrice = price1char;
    } else if (domainLength == 2) {
      selectedPrice = price2char;
    } else if (domainLength == 3) {
      selectedPrice = price3char;
    } else if (domainLength == 4) {
      selectedPrice = price4char;
    } else {
      selectedPrice = price5char;
    }

    // mint a domain
    tokenId = tldContract.mint{value: 0}(_domainName, _domainHolder, address(0));

    // mint a feature
    string memory selFeature = metadataContract.setUniqueFeaturesId(tokenId, _featureIds, selectedPrice);
    emit FeatureMinted(selFeature);

    // send referral fee
    if (referralFee > 0 && _referrer != address(0)) {
      uint256 referralPayment = (selectedPrice * referralFee) / MAX_BPS;
      selectedPrice -= referralPayment;
      paymentToken.transferFrom(_msgSender(), _referrer, referralPayment);
    }

    // send the rest to the owner
    paymentToken.transferFrom(_msgSender(), tldContract.owner(), selectedPrice);

    // update total payments
    totalPayments += selectedPrice;

    if (totalPayments >= maxTotalPayments) {
      paused = true;
    }
  }

  // OWNER

  /// @notice This changes referral fee in the minter contract
  function changeMaxTotalPayments(uint256 _maxPay) external onlyOwner {
    maxTotalPayments = _maxPay;
  }

  /// @notice This changes metadata contract in the minter contract
  function changeMetadataContract(address _metadataAddress) external onlyOwner {
    metadataContract = IPunkAngelMetadata(_metadataAddress);
  }

  /// @notice This changes price in the minter contract
  function changePrice(uint256 _price, uint256 _chars) external onlyOwner {
    require(_price > 0, "Cannot be zero");

    if (_chars == 1) {
      price1char = _price;
    } else if (_chars == 2) {
      price2char = _price;
    } else if (_chars == 3) {
      price3char = _price;
    } else if (_chars == 4) {
      price4char = _price;
    } else if (_chars == 5) {
      price5char = _price;
    }
  }

  /// @notice This changes referral fee in the minter contract
  function changeReferralFee(uint256 _referral) external onlyOwner {
    require(_referral <= 2000, "Cannot exceed 20%");
    referralFee = _referral;
  }

  /// @notice Recover any ERC-20 token mistakenly sent to this contract address
  function recoverERC20(address tokenAddress_, uint256 tokenAmount_, address recipient_) external onlyOwner {
    IERC20(tokenAddress_).transfer(recipient_, tokenAmount_);
  }

  /// @notice Recover any ERC-721 token mistakenly sent to this contract address
  function recoverERC721(address tokenAddress_, uint256 tokenId_, address recipient_) external onlyOwner {
    IERC721(tokenAddress_).transferFrom(address(this), recipient_, tokenId_);
  }

  function togglePaused() external onlyOwner {
    paused = !paused;
  }

  // withdraw ETH from contract
  function withdraw() external onlyOwner {
    (bool success, ) = owner().call{value: address(this).balance}("");
    require(success, "Failed to withdraw ETH from contract");
  }

  // RECEIVE & FALLBACK
  receive() external payable {}
  fallback() external payable {}
 
}