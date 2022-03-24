// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

// Mock NFT contract for testing purposes only
contract MockErc721Token is ERC721 {
  uint256 public counter;

  constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {
    counter = 0;
    mint(msg.sender);
    counter++;
  }

  function mint(address receiver) public {
    _safeMint(receiver, counter);
    counter++;
  }
}