// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

interface IFlexiPunkMetadata {

  function getMetadata(string calldata _fullDomainName, uint256 _tokenId, address _tldAddress) external view returns(string memory);

}
