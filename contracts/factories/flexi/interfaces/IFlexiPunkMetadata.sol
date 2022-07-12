// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

interface IFlexiPunkMetadata {

  function getMetadata(string calldata _domainName, string calldata _tld, uint256 _tokenId) external view returns(string memory);

}
