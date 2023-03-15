// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../lib/strings.sol";

interface IFlexiPunkTLD is IERC721 {

  function owner() external view returns(address);

  function mint(
    string memory _domainName,
    address _domainHolder,
    address _referrer
  ) external payable returns(uint256);

}

// generic punk minter contract
// - no minting restrictions (anyone can mint)
// - tiered pricing
// - public good funding matching pool
contract GivethMinter is Ownable, ReentrancyGuard {
  address public pgfAddress;
  address public devAddress;

  bool public paused = true;

  uint256 public discountBps = 5000; // 50% discount for Giveth Givers NFT holders
  uint256 public referralFee; // share of each domain purchase (in bips) that goes to the referrer
  uint256 public pgfFee; // share of each domain purchase (in bips) that goes to the Giveth Matching Pool
  uint256 public constant MAX_BPS = 10_000;

  uint256 public price1char; // 1 char domain price
  uint256 public price2char; // 2 chars domain price
  uint256 public price3char; // 3 chars domain price
  uint256 public price4char; // 4 chars domain price
  uint256 public price5char; // 5+ chars domain price

  IFlexiPunkTLD public immutable tldContract;

  // CONSTRUCTOR
  constructor(
    address _pgfAddress,
    address _devAddress,
    address _tldAddress,
    uint256 _referralFee,
    uint256 _pgfFee,
    uint256 _price1char,
    uint256 _price2char,
    uint256 _price3char,
    uint256 _price4char,
    uint256 _price5char
  ) {
    pgfAddress = _pgfAddress;
    devAddress = _devAddress;
    tldContract = IFlexiPunkTLD(_tldAddress);

    referralFee = _referralFee;
    pgfFee = _pgfFee;

    price1char = _price1char;
    price2char = _price2char;
    price3char = _price3char;
    price4char = _price4char;
    price5char = _price5char;
  }

  // WRITE

  function mint(
    string memory _domainName,
    address _domainHolder,
    address _referrer,
    bool _isNftHolder
  ) external nonReentrant payable returns(uint256 tokenId) {
    require(!paused, "Minting paused");

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

    if (_isNftHolder) {
      selectedPrice = (selectedPrice * (MAX_BPS - discountBps)) / MAX_BPS;
    }

    require(msg.value >= selectedPrice, "Value below price");

    // send referral fee
    if (referralFee > 0 && _referrer != address(0)) {
      uint256 referralPayment = (selectedPrice * referralFee) / MAX_BPS;
      (bool sentReferralFee, ) = payable(_referrer).call{value: referralPayment}("");
      require(sentReferralFee, "Failed to send referral fee");

      selectedPrice -= referralPayment;
    }

    // send pgfFee
    if (pgfFee > 0 && pgfAddress != address(0)) {
      uint256 pgfFeePayment = (selectedPrice * pgfFee) / MAX_BPS;
      (bool sentPgfFee, ) = payable(pgfAddress).call{value: pgfFeePayment}("");
      require(sentPgfFee, "Failed to send pgfFee");

      selectedPrice -= pgfFeePayment;
    }

    // send developer fee
    if (devAddress != address(0)) {
      uint256 devPayment = selectedPrice / 2;
      (bool sentDevFee, ) = payable(devAddress).call{value: devPayment}("");
      require(sentDevFee, "Failed to send developer fee");
    }

    // send the rest to TLD owner
    (bool sent, ) = payable(tldContract.owner()).call{value: address(this).balance}("");
    require(sent, "Failed to send domain payment to TLD owner");

    // mint a domain
    tokenId = tldContract.mint{value: 0}(_domainName, _domainHolder, address(0));
  }

  // OWNER

  /// @notice This changes the discountBps in the minter contract
  function changeDiscountBps(uint256 _discountBps) external onlyOwner {
    require(_discountBps <= 8000, "Cannot exceed 80%");
    discountBps = _discountBps;
  }

  /// @notice This changes the pgfFee in the minter contract
  function changePgfFee(uint256 _pgfFee) external onlyOwner {
    require(_pgfFee <= 8000, "Cannot exceed 80%");
    pgfFee = _pgfFee;
  }

  /// @notice This changes the pgfAddress in the minter contract
  function changePgfAddress(address _pgfAddress) external onlyOwner {
    pgfAddress = _pgfAddress;
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
  function changeReferralFee(uint256 _referralFee) external onlyOwner {
    require(_referralFee <= 2000, "Cannot exceed 20%");
    referralFee = _referralFee;
  }

  function ownerFreeMint(
    string memory _domainName,
    address _domainHolder
  ) external nonReentrant onlyOwner returns(uint256 tokenId) {
    // mint a domain
    tokenId = tldContract.mint{value: 0}(_domainName, _domainHolder, address(0));
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

  // OTHER WRITE METHODS

  /// @notice This changes the Developer address in the minter contract
  function changeDevAddress(address _devAddress) external {
    require(_msgSender() == devAddress, "Sender is not the developer");
    devAddress = _devAddress;
  }

  // RECEIVE & FALLBACK
  receive() external payable {}
  fallback() external payable {}
 
}