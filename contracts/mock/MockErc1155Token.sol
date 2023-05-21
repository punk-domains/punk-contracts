// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

// Mock NFT contract for testing purposes only
contract MockErc1155Token is ERC1155 {

  constructor() ERC1155("") {
    _mint(msg.sender, 1, 1, ""); // Mint one ERC-1155 of ID 1
  }

  function mint(address receiver_, uint256 tokenId_, uint256 amount_) public {
    _mint(receiver_, tokenId_, amount_, "");
  }
}