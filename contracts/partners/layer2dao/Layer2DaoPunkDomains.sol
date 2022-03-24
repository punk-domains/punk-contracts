// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "../../interfaces/IPunkTLD.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Layer2DaoPunkDomains is Ownable, ReentrancyGuard {
  address[] public supportedNfts; // whitelisted Layer2DAO NFT contracts
  bool public paused = true;

  // a mapping that shows which NFT IDs have already minted a .L2 domain; (NFT address => (tokenID => true/false))
  mapping (address => mapping (uint256 => bool)) public mintedL2;

  // a mapping that shows which NFT IDs have already minted a .Layer2 domain; (NFT address => (tokenID => true/false))
  mapping (address => mapping (uint256 => bool)) public mintedLayer2;

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
  function mint(
    string memory _domainName,
    uint8 _tld, // 1: .L2 // 2: .LAYER2
    address _nftAddress, // whitelisted Layer2DAO Early Adopter NFT
    uint256 _nftTokenId,
    address _referrer
  ) external payable nonReentrant returns(uint256) {
    require(!paused || msg.sender == owner(), "Minting disabled");

    // check if provided NFT address is whitelisted
    bool isWhitelisted = false;

    for (uint256 i = 0; i < supportedNfts.length; i++) {
      if (_nftAddress == supportedNfts[i]) {
        isWhitelisted = true;
        break;
      }
    }

    require(isWhitelisted, "The provided NFT address is not whitelisted");

    // check if user has the required Layer2DAO NFT
    IERC721 nftContract = IERC721(_nftAddress);

    require(
      nftContract.ownerOf(_nftTokenId) == msg.sender,
      "Sender is not the provided NFT owner."
    );

    // get the selected TLD contract (either .L2 or .LAYER2)
    IPunkTLD selectedContract;

    if (_tld == 1) {
      selectedContract = tldL2Contract;
    } else if (_tld == 2) {
      selectedContract = tldLayer2Contract;
    }

    // check domain price
    require(msg.value >= selectedContract.price(), "Value below price");

    // mark that the NFT ID has minted a domain (to prevent multiple mints)
    if (_tld == 1) {
      mintedL2[_nftAddress][_nftTokenId] = true;
    } else if (_tld == 2) {
      mintedLayer2[_nftAddress][_nftTokenId] = true;
    }

    // mint domain 
    return selectedContract.mint{value: msg.value}(_domainName, msg.sender, _referrer);
  }

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