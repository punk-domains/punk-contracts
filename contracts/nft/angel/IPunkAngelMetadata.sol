// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

interface IPunkAngelMetadata {

  function getMetadata(uint256 _tokenId) external view returns(string memory);

}
