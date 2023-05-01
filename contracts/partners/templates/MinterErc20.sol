// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IFlexiPunkTLD {
  function mint(
    string memory _domainName,
    address _domainHolder,
    address _referrer
  ) external payable returns(uint256);
}

// generic minter contract (ERC-20 token for payment)
// - no minting restrictions (anyone can mint)
// - erc-20 token payment
// - two team addresses
contract MinterErc20 is Ownable, ReentrancyGuard {
  address public teamAddress1;
  address public teamAddress2;
  address public immutable tldAddress;
  address public immutable tokenAddress;

  bool public paused = false;

  uint256 public price; // price per domain in ERC-20 tokens
  uint256 public referralFee = 1_000; // share of each domain purchase (in bips) that goes to the referrer
  
  // CONSTRUCTOR
  constructor(
    address _teamAddress1,
    address _teamAddress2,
    address _tldAddress,
    address _tokenAddress,
    uint256 _price
  ) {
    teamAddress1 = _teamAddress1;
    teamAddress2 = _teamAddress2;
    tldAddress = _tldAddress;
    tokenAddress = _tokenAddress;
    price = _price;
  }

  // WRITE

  function mint(
    string memory _domainName,
    address _domainHolder,
    address _referrer
  ) external nonReentrant returns(uint256 tokenId) {
    require(!paused, "Minting paused");

    uint256 mintPrice = price;

    // send referral fee
    if (referralFee > 0 && _referrer != address(0)) {
      uint256 referralPayment = (mintPrice * referralFee) / 10_000;
      mintPrice -= referralPayment;
      IERC20(tokenAddress).transferFrom(msg.sender, _referrer, referralPayment);
    }

    // send team fees (half-half)
    IERC20(tokenAddress).transferFrom(msg.sender, teamAddress1, mintPrice / 2);

    mintPrice -= mintPrice / 2;
    IERC20(tokenAddress).transferFrom(msg.sender, teamAddress2, mintPrice);

    // mint a domain
    tokenId = IFlexiPunkTLD(tldAddress).mint{value: 0}(_domainName, _domainHolder, address(0));
  }

  // OWNER

  // change price
  function changePrice(uint256 _price) external onlyOwner {
    price = _price;
  }

  /// @notice This changes referral fee in the minter contract
  function changeReferralFee(uint256 _referralFee) external onlyOwner {
    require(_referralFee <= 2000, "Cannot exceed 20%");
    referralFee = _referralFee;
  }

  function changeTeamAddress1(address _teamAddress1) external onlyOwner {
    teamAddress1 = _teamAddress1;
  }

  function changeTeamAddress2(address _teamAddress2) external onlyOwner {
    teamAddress2 = _teamAddress2;
  }

  function ownerFreeMint(
    string memory _domainName,
    address _domainHolder
  ) external onlyOwner returns(uint256 tokenId) {
    // mint a domain
    tokenId = IFlexiPunkTLD(tldAddress).mint{value: 0}(_domainName, _domainHolder, address(0));
  }

  /// @notice Recover any ERC-20 token mistakenly sent to this contract address
  function recoverERC20(address tokenAddress_, uint256 tokenAmount_, address recipient_) external onlyOwner {
    IERC20(tokenAddress_).transfer(recipient_, tokenAmount_);
  }

  function togglePaused() external onlyOwner {
    paused = !paused;
  }
}