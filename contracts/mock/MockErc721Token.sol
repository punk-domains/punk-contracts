// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

// Mock NFT contract for testing purposes only
contract MockErc721Token is ERC721, ERC721Enumerable {
  uint256 public counter;

  constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {
    counter = 0;
    _safeMint(msg.sender, counter);
    counter++;
  }

  function mint(address receiver) public {
    _safeMint(receiver, counter);
    counter++;
  }
  
  function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override(ERC721, ERC721Enumerable) {
    super._beforeTokenTransfer(from, to, tokenId);
  }

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721Enumerable) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}