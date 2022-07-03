// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../factories/flexi/interfaces/IFlexiPunkMetadata.sol";
import "./interfaces/IFlexiPunkTLD.sol";

contract PunkAngelMinter is Ownable, ReentrancyGuard {
  bool public paused = true;
  uint256 public price; // domain price
  uint256 public referralFee = 1_000; // share of each domain purchase (in bips) that goes to the referrer
  uint256 public constant MAX_BPS = 10_000;

  // TLD contract (.punkangel)
  IFlexiPunkTLD public immutable tldContract;

  // EVENTS
  event FeatureMinted(string indexed featureId_);

  // CONSTRUCTOR
  constructor(
    address _tldAddress,
    uint256 _price
  ) {
    tldContract = IFlexiPunkTLD(_tldAddress);
    price = _price;
  }

  // OWNER
  // changePrice
  // changeReferralFee
  // togglePaused
 
}