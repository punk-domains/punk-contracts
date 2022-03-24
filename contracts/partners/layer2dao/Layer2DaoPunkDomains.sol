// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "../../interfaces/IPunkTLD.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Layer2DaoPunkDomains is Ownable, ReentrancyGuard {
  address[] public supportedNfts; // whitelisted Layer2DAO NFT contracts
  bool public paused = true;

  // TLD addresses
  address public tldL2; // .L2/.l2 TLD
  address public tldLayer2; // .LAYER2/.layer2 TLD

  // TLD contracts
  IPunkTLD tldL2Contract;
  IPunkTLD tldLayer2Contract;

  // CONSTRUCTOR
  constructor(
    address _nftAddress, // the first whitelisted NFT address
    address _tldL2,
    address _tldLayer2
  ) {
    supportedNfts.push(_nftAddress);

    tldL2 = _tldL2;
    tldL2Contract = IPunkTLD(tldL2);

    tldLayer2 = _tldLayer2;
    tldLayer2Contract = IPunkTLD(tldLayer2);
  }

  // READ
  function getSupportedNftsArrayLength() public view returns(uint) {
    return supportedNfts.length;
  }

  // WRITE

  // OWNER
  function addWhitelistedNftContract(address _nftAddress) external onlyOwner {
    supportedNfts.push(_nftAddress);
  }

  function removeWhitelistedNftContract(uint _nftIndex) external onlyOwner {
    supportedNfts[_nftIndex] = supportedNfts[supportedNfts.length - 1];
    supportedNfts.pop();
  }

  // transfer TLDs ownership
  function transferTldsOwnership(address _newTldOwner) external onlyOwner {
    tldL2Contract.transferOwnership(_newTldOwner);
    tldLayer2Contract.transferOwnership(_newTldOwner);
  }

  function togglePaused() external onlyOwner {
    paused = !paused;
  }
}