// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "../../interfaces/IPunkTLD.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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

  function getSupportedNftsArray() public view returns(address[] memory) {
    return supportedNfts;
  }

  function isNftIdAlreadyUsed(address _nftAddress, uint256 _nftTokenId, uint8 _tld) public view returns(bool used) {
    if (_tld == 1) {
      return mintedL2[_nftAddress][_nftTokenId];
    } else if (_tld == 2) {
      return mintedLayer2[_nftAddress][_nftTokenId];
    } 
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
    require(!isNftIdAlreadyUsed(_nftAddress, _nftTokenId, _tld), "This NFT was already used for minting a domain of the chosen TLD");

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

  function changeTldPrice(uint256 _price, uint8 _tld) external onlyOwner {
    IPunkTLD selectedContract;

    if (_tld == 1) {
      selectedContract = tldL2Contract;
    } else if (_tld == 2) {
      selectedContract = tldLayer2Contract;
    }

    selectedContract.changePrice(_price);
  }

  /// @notice Referral fee cannot be 5000 bps or higher
  function changeReferralFee(uint256 _referral, uint8 _tld) external onlyOwner {
    IPunkTLD selectedContract;

    if (_tld == 1) {
      selectedContract = tldL2Contract;
    } else if (_tld == 2) {
      selectedContract = tldLayer2Contract;
    }

    selectedContract.changeReferralFee(_referral);
  }

  /// @notice Owner can mint a domain without holding/using an NFT
  function ownerMintDomain(
    string memory _domainName,
    uint8 _tld, // 1: .L2 // 2: .LAYER2
    address _domainHolder
  ) external payable nonReentrant onlyOwner returns(uint256) {
    // get the selected TLD contract (either .L2 or .LAYER2)
    IPunkTLD selectedContract;

    if (_tld == 1) {
      selectedContract = tldL2Contract;
    } else if (_tld == 2) {
      selectedContract = tldLayer2Contract;
    }

    // mint domain 
    return selectedContract.mint{value: msg.value}(_domainName, _domainHolder, address(0));
  }

  function removeWhitelistedNftContract(uint _nftIndex) external onlyOwner {
    supportedNfts[_nftIndex] = supportedNfts[supportedNfts.length - 1];
    supportedNfts.pop();
  }

  // recover tokens
  function recoverERC20(address tokenAddress_, uint256 tokenAmount_, address recipient_) external onlyOwner {
    IERC20(tokenAddress_).transfer(recipient_, tokenAmount_);
  }

  function recoverERC721(address tokenAddress_, uint256 tokenId_, address recipient_) external onlyOwner {
    IERC721(tokenAddress_).transferFrom(address(this), recipient_, tokenId_);
  }

  // transfer TLDs ownership
  function transferTldsOwnership(address _newTldOwner) external onlyOwner {
    tldL2Contract.transferOwnership(_newTldOwner);
    tldLayer2Contract.transferOwnership(_newTldOwner);
  }

  function togglePaused() external onlyOwner {
    paused = !paused;
  }

  // withdraw ETH from contract
  function withdraw() external onlyOwner {
    (bool success, ) = owner().call{value: address(this).balance}("");
    require(success, "Failed to send ETH from withdraw() function");
  }

  // receive & fallback
  receive() external payable {}
  fallback() external payable {}
}
