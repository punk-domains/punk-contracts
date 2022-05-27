// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IPunkAngelMetadata.sol";

contract PunkAngelNft is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard {
  bool public metadataFrozen = false;
  bool public paused = true;
  bool public stopMint = false; // permanently stop the minting (even if max supply is not hit)

  uint256 public idCounter;
  uint256 public maxSupply = 1000;
  uint256 public price; // NFT price in USDC
  address public metadataAddress;

  IERC20 public immutable usdc; // $USDC contract (6 decimals)

  mapping (address => bool) public minters; // addresses which are allowed to mint for free

  // EVENTS
  event FreezeMetadata(address user, address mtdAddr);
  event PriceChanged(address indexed user, uint256 price_);

  // CONSTRUCTOR
  constructor(
    string memory _name, 
    string memory _symbol,
    uint256 _idCounter,
    uint256 _price,
    address _metadataAddress,
    address _usdcAddress
  ) ERC721(_name, _symbol) {
    idCounter = _idCounter;
    price = _price;
    metadataAddress = _metadataAddress;
    usdc = IERC20(_usdcAddress);
  }

  // READ

  function tokenURI(uint256 _tokenId) public view override returns (string memory) {
    return IPunkAngelMetadata(metadataAddress).getMetadata(_tokenId);
  }

  // WRITE

  /// @notice A $USDC approval transaction is needed to be made before minting
  function mint(
    address _receiver,
    uint256 amount
  ) external nonReentrant returns(uint256) {
    require(!paused, "Minting paused");
    require(!stopMint, "Minting permanently stopped");
    require(totalSupply() < maxSupply, "Max supply already reached");
    require(amount < 100, "Amount is too high");

    if (!minters[msg.sender]) {
      usdc.transferFrom(msg.sender, owner(), price*amount);
    }

    for (uint256 i = 0; i < amount;) {
      _mint(_receiver, idCounter);
      unchecked { ++i; }
    }

    unchecked { ++idCounter; }

    return totalSupply();
  }
  
  // OWNER

  /// @notice Price in USDC (6 decimals)
  function changePrice(uint256 _price) external onlyOwner {
    price = _price;
    emit PriceChanged(_msgSender(), _price);
  }

  // TODO: changeMaxSupply
  
  function changeMetadataAddress(address _metadataAddress) external onlyOwner {
    require(!metadataFrozen, "Cannot change metadata address anymore");
    metadataAddress = _metadataAddress;
  }

  // TODO: freezeMetadata
  // TODO: toggleMinter
  // TODO: stopMintingPermanently

  function togglePaused() external onlyOwner {
    paused = !paused;
  }
  
  // ERC721Enumerable required functions
  function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override(ERC721, ERC721Enumerable) {
    super._beforeTokenTransfer(from, to, tokenId);
  }

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721Enumerable) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}